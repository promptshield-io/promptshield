/**
 * PromptShield CLI runtime.
 *
 * This module orchestrates scanning, ignore filtering, fixing,
 * and sanitization across files provided by the CLI.
 *
 * Responsibilities:
 * - file IO
 * - command routing
 * - logging
 * - CI fast-fail mode
 *
 * Non-responsibilities:
 * - detection logic (@promptshield/core)
 * - ignore parsing (@promptshield/ignore)
 * - text rewriting (@promptshield/sanitizer)
 */

import { readFile, writeFile } from "node:fs/promises";
import { type Severity, scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import { applyFixes, sanitize, sanitizeStrict } from "@promptshield/sanitizer";
import { createLogger, deepMerge, type LogLevel } from "@turbo-forge/cli-kit";

/**
 * CLI configuration options.
 */
export interface PromptshieldCliOptions {
  logLevel?: LogLevel;
  command?: "scan" | "fix" | "sanitize";
  minSeverity?: Severity;
  files?: string[];
  json?: boolean;
  strict?: boolean;
  write?: boolean;
  check?: boolean;
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
 * Executes PromptShield CLI workflow.
 *
 * Processing flow:
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
 *   stop scanning immediately after first detected threat
 *   and exit with non-zero status.
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

  for (const file of config.files) {
    const content = await readFile(file, "utf-8");

    /* ----------------------------- SANITIZE ----------------------------- */

    if (config.command === "sanitize") {
      const sanitized = config.strict
        ? sanitizeStrict(content)
        : sanitize(content);

      if (config.write) {
        await writeFile(file, sanitized);
        logger.info(`Sanitized ${file}`);
      } else {
        logger.info(`--- ${file} (sanitized preview) ---\n${sanitized}`);
      }

      continue;
    }

    /* -------------------------------- SCAN ------------------------------ */

    const scanResult = scan(content, {
      minSeverity: config.minSeverity,
      stopOnFirstThreat: config.check,
    });

    const { threats: filtered, unusedIgnores } = filterThreats(
      content,
      scanResult.threats,
    );

    if (config.check && filtered.length > 0) {
      logger.error(`Threat detected in ${file}`);
      process.exitCode = 1;
      break;
    }

    if (config.command === "scan") {
      if (config.json) {
        // Use console.log so JSON output can be piped safely
        console.log(JSON.stringify({ file, threats: filtered }));
      } else {
        logger.info(`${file}: ${filtered.length} threat(s)`);

        filtered.forEach((threat) => {
          logger[SEVERITY_TO_LOG_LEVEL[threat.severity]](
            `${threat.loc.line}:${threat.loc.column} ${threat.category} — ${threat.message}`,
          );
        });

        unusedIgnores.forEach((rule) => {
          logger.warn(`Unused ignore directive at line ${rule.definedAt}`);
        });
      }

      continue;
    }

    /* -------------------------------- FIX ------------------------------- */

    if (config.command === "fix") {
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
  }
};
