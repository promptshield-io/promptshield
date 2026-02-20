/**
 * PromptShield CLI runtime.
 *
 * Orchestrates file processing for the PromptShield CLI.
 * This module coordinates scanning, ignore filtering, fixing,
 * sanitization, logging, and CI check behavior.
 *
 * Responsibilities
 * ----------------
 * - File IO
 * - Command routing
 * - Logging + reporting
 * - CI fast-fail mode
 *
 * Non-responsibilities
 * --------------------
 * - Detection logic (@promptshield/core)
 * - Ignore parsing (@promptshield/ignore)
 * - Text rewriting (@promptshield/sanitizer)
 */

import { readFile, writeFile } from "node:fs/promises";
import { type Severity, scan } from "@promptshield/core";
import { type FilterThreatsResult, filterThreats } from "@promptshield/ignore";
import { applyFixes, sanitize, sanitizeStrict } from "@promptshield/sanitizer";
import { createLogger, deepMerge, type LogLevel } from "@turbo-forge/cli-kit";

/**
 * Options accepted by the PromptShield CLI runtime.
 */
export interface PromptshieldCliOptions {
  /**
   * Logging verbosity level.
   */
  logLevel?: LogLevel;

  /**
   * CLI command to execute.
   */
  command?: "scan" | "fix" | "sanitize";

  /**
   * Minimum severity threshold to report.
   */
  minSeverity?: Severity;

  /**
   * Files to process.
   */
  files?: string[];

  /**
   * Emit JSON output instead of logs.
   */
  json?: boolean;

  /**
   * Enable strict sanitization mode.
   */
  strict?: boolean;

  /**
   * Persist changes to disk.
   */
  write?: boolean;

  /**
   * CI mode — fail on first detected threat.
   */
  check?: boolean;

  /**
   * Disable inline ignore rules in comments (e.g., // promptshield-ignore).
   * Forces all rules to be evaluated.
   */
  noIgnore?: boolean;
}

/**
 * Default CLI configuration.
 */
export const DEFAULT_CONFIG: Required<PromptshieldCliOptions> = {
  logLevel: "info",
  command: "scan",
  minSeverity: "LOW",
  files: [],
  json: false,
  strict: false,
  write: false,
  check: false,
  noIgnore: process.env["CI"] === "true" || process.env["CI"] === "1",
};

/**
 * Maps threat severity to logger level.
 */
const SEVERITY_TO_LOG_LEVEL: Record<Severity, LogLevel> = {
  CRITICAL: "error",
  HIGH: "warn",
  MEDIUM: "info",
  LOW: "debug",
};

/**
 * Executes the PromptShield CLI workflow.
 *
 * Processing flow:
 * ---------------
 *
 * sanitize:
 *   file → sanitize → write/preview
 *
 * scan:
 *   file → scan → filter ignores → report
 *
 * fix:
 *   file → scan → filter ignores → applyFixes → write/preview
 *
 * check mode:
 *   scanning stops immediately after the first detected threat.
 */
export const runPromptShield = async (
  options: PromptshieldCliOptions,
): Promise<void> => {
  const config = deepMerge(
    DEFAULT_CONFIG,
    options,
  ) as Required<PromptshieldCliOptions>;

  const logger = createLogger({ level: config.logLevel });

  if (!config.files.length) {
    logger.warn("No files provided.");
    return;
  }

  if (config.command === "sanitize") {
    const sanitizer = config.strict ? sanitizeStrict : sanitize;

    for (const file of config.files) {
      const content = await readFile(file, "utf-8");
      const sanitized = sanitizer(content);
      if (config.write) {
        await writeFile(file, sanitized);
        logger.info(`Sanitized ${file}`);
      } else {
        logger.info(`--- ${file} (sanitized preview) ---\n${sanitized}`);
      }
    }
    return;
  }

  for (const file of config.files) {
    const content = await readFile(file, "utf-8");

    /* -------------------------------- SCAN ------------------------------ */

    const scanResult = scan(content, {
      minSeverity: config.minSeverity,
      stopOnFirstThreat: config.check && config.noIgnore,
    });

    const filteredResult: FilterThreatsResult = filterThreats(
      content,
      scanResult.threats,
      { noIgnore: config.noIgnore },
    );

    const {
      threats: filtered,
      unusedIgnores,
      ignoredBySeverity,
    } = filteredResult;

    if (config.check && filtered.length > 0) {
      logger.error(`Threat detected in ${file}`);
      process.exitCode = 1;
      break;
    }

    if (config.command === "scan") {
      if (config.json) {
        console.log(JSON.stringify({ file, threats: filtered }));
      } else {
        logger.info(`${file}: ${filtered.length} threat(s)`);

        filtered.forEach((threat) => {
          logger[SEVERITY_TO_LOG_LEVEL[threat.severity]](
            `${threat.loc.line}:${threat.loc.column} ${threat.ruleId} — ${threat.message}\nRefer: ${threat.referenceUrl}\n\n`,
          );
        });

        unusedIgnores.forEach((rule) => {
          logger.warn(`Unused ignore directive at line ${rule.definedAt}`);
        });
      }

      continue;
    }

    if (config.command === "fix") {
      /* -------------------------------- FIX ------------------------------- */

      const result = applyFixes(content, filtered);

      if (config.write) {
        await writeFile(file, result.text);
        logger.info(`${file}: fixed ${result.fixed.length}`);
      } else {
        logger.info(`--- ${file} (fixed preview) ---\n${result.text}`);
      }

      if (result.skipped.length > 0) {
        logger.warn(`${file}: skipped ${result.skipped.length} threat(s)`);
      }
    }

    const parts = Object.entries(ignoredBySeverity)
      .filter(([, count]) => count > 0)
      .map(([severity, count]) => `${count} ${severity.toLowerCase()}`);

    if (parts.length > 0) {
      logger.warn(
        `Skipped ${parts.join(", ")} threat(s) via promptshield-ignore`,
      );
    }
  }
};
