/**
 * -----------------------------------------------------------------------------
 * PromptShield CLI Runtime
 * -----------------------------------------------------------------------------
 *
 * High-level orchestration layer for the PromptShield command-line interface.
 *
 * This module coordinates:
 * - Configuration normalization
 * - Command routing (scan | fix | sanitize)
 * - Workspace streaming execution
 * - Logging and structured output
 * - CI enforcement behavior
 *
 * Architectural Role
 * -------------------
 * This file acts strictly as a runtime coordinator.
 * All domain logic is delegated to lower-level packages.
 *
 * Responsibilities
 * ----------------
 * - Merge defaults with resolved configuration
 * - Execute CI check mode (fast failure scan)
 * - Stream workspace-level scan/fix/sanitize operations
 * - Format console or JSON output
 * - Generate optional Markdown reports
 * - Map threat severities to log levels
 *
 * Non-Responsibilities
 * --------------------
 * - Threat detection logic                → @promptshield/core
 * - Inline ignore directive processing    → @promptshield/ignore
 * - Workspace traversal & caching         → @promptshield/workspace
 * - File sanitization implementation      → @promptshield/workspace
 *
 * Design Guarantees
 * -----------------
 * - No detection rules are implemented here
 * - No ignore parsing logic is implemented here
 * - No cache format assumptions are made here
 * - Streaming execution enables scalability for large repositories
 *
 * This layer should remain orchestration-only.
 */

import { readFile } from "node:fs/promises";
import os from "node:os";
import { relative } from "node:path";
import { type Severity, scan } from "@promptshield/core";
import {
  type FilteredThreatsResult,
  filterThreats,
} from "@promptshield/ignore";
import {
  type CacheMode,
  type FileScanResult,
  generateWorkspaceReport,
  isBinary,
  PROMPTSHIELD_ARTIFACTS_DIR,
  PROMPTSHIELD_REPORT_FILE,
  resolveFiles,
  runWorkspaceScan,
  sanitizeWorkspace,
  type WorkspaceScanConfig,
} from "@promptshield/workspace";
import {
  createLogger,
  deepMerge,
  findProjectRoot,
  type LogLevel,
} from "@turbo-forge/cli-kit";

/**
 * CLI options for the PromptShield command-line interface.
 *
 * This interface represents the normalized, programmatic shape of
 * user-provided CLI flags after argument parsing.
 *
 * Notes:
 * - All properties are optional to allow layered configuration
 *   (defaults → config file → CLI flags).
 * - Final effective values are resolved by the CLI bootstrap layer.
 */
export interface PromptshieldCliOptions {
  /**
   * Logging verbosity level.
   *
   * Controls console output granularity.
   * Higher verbosity provides additional diagnostic context.
   *
   * When `json` is enabled, log output is suppressed regardless of this value.
   *
   * @default "info"
   */
  logLevel?: LogLevel;

  /**
   * CLI command to execute.
   *
   * - `"scan"`     → analyze files and report threats.
   * - `"fix"`      → scan and apply automatic fixes where possible.
   * - `"sanitize"` → transform input defensively (may be stricter than fix).
   *
   * @default "scan"
   */
  command?: "scan" | "fix" | "sanitize";

  /**
   * Minimum severity threshold to report.
   *
   * Only threats with severity greater than or equal to this level
   * are included in output.
   *
   * When caching is enabled, baseline scans may still run at a lower
   * severity internally to preserve correctness.
   *
   * @default "LOW"
   */
  minSeverity?: Severity;

  /**
   * Glob patterns specifying files to process.
   *
   * Patterns are resolved relative to the current working directory.
   *
   * If omitted, the CLI may fallback to a default pattern set
   * (e.g., `["** /*"]` or project-configured values).
   */
  patterns?: string[];

  /**
   * Emit structured JSON output instead of human-readable logs.
   *
   * Intended for:
   * - CI pipelines
   * - Machine consumption
   * - Automated tooling integrations
   *
   * When enabled:
   * - Console formatting is suppressed
   * - Output is deterministic and parseable
   *
   * @default false
   */
  json?: boolean;

  /**
   * Enable strict sanitization mode.
   *
   * In strict mode:
   * - Potentially unsafe constructs may be rejected rather than fixed.
   * - Heuristics are minimized in favor of explicit safety guarantees.
   *
   * Intended for high-security or CI enforcement workflows.
   *
   * @default false
   */
  strict?: boolean;

  /**
   * Persist modifications to disk.
   *
   * When enabled:
   * - Fix or sanitize operations write changes to files.
   * - When disabled, operations run in dry-run mode.
   *
   * Ignored for pure scan commands.
   *
   * @default false
   */
  write?: boolean;

  /**
   * CI enforcement mode.
   *
   * When enabled:
   * - Process exits with non-zero status if threats are detected.
   * - Designed for pipeline gating and automated checks.
   *
   * May implicitly adjust other defaults (e.g., disable inline ignores).
   *
   * @default false
   */
  check?: boolean;

  /**
   * Disable inline ignore directives (e.g., `// promptshield-ignore`).
   *
   * When enabled:
   * - All rules are evaluated without honoring in-source suppression.
   * - Useful for CI audits or security reviews.
   *
   * @default true if CI environment is detected
   */
  noInlineIgnore?: boolean;

  /**
   * Cache storage strategy.
   *
   * - `"none"`   → disable persistent cache
   * - `"single"` → one `cache.json` file
   * - `"split"`  → per-file hashed cache entries
   * - `"auto"`   → strategy selected via repository size heuristic
   *
   * When enabled (`cacheMode !== "none"`), cache stores baseline
   * filtered results computed using:
   * - `minSeverity: "LOW"`
   * - inline ignore directives enabled
   *
   * Severity filtering and `noInlineIgnore` are applied
   * after cache retrieval.
   *
   * @default "auto"
   */
  cacheMode?: CacheMode | "none";

  /**
   * Forces a full rescan of all files and refreshes cache entries.
   *
   * Ignored when `cacheMode === "none"`.
   *
   * @default false
   */
  forceFullScan?: boolean;

  /**
   * Generate a detailed Markdown workspace report describing found threats.
   *
   * @default false
   */
  report?: boolean;
}

/**
 * Default CLI configuration.
 */
export const DEFAULT_CONFIG: Required<PromptshieldCliOptions> = {
  logLevel: "info",
  command: "scan",
  minSeverity: "LOW",
  patterns: [],
  json: false,
  strict: false,
  write: false,
  check: false,
  noInlineIgnore: process.env["CI"] === "true" || process.env["CI"] === "1",
  cacheMode:
    process.env["CI"] === "true" || process.env["CI"] === "1" ? "none" : "auto",
  forceFullScan: false,
  report: false,
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
 * Execute the PromptShield CLI workflow.
 *
 * Execution Model
 * ---------------
 *
 * 1. Merge configuration layers
 * 2. Initialize logger
 * 3. If `check` mode:
 *      - Resolve files
 *      - Skip binary files
 *      - Run core scan
 *      - Apply inline ignore filtering
 *      - Exit early on first threat
 * 4. Otherwise:
 *      - Route to sanitize OR
 *      - Stream workspace scan/fix
 * 5. Aggregate and format results
 * 6. Optionally emit JSON or Markdown report
 *
 * Key Behaviors
 * -------------
 * - Streaming execution for scalability
 * - Concurrency based on available CPU cores
 * - Workspace-level caching (delegated)
 * - Inline ignore evaluation via @promptshield/ignore
 * - Detection performed via @promptshield/core
 *
 * This function does NOT:
 * - Implement detection rules
 * - Implement ignore parsing
 * - Implement caching mechanics
 * - Perform direct file traversal logic
 *
 * Those responsibilities are delegated to:
 * - @promptshield/core
 * - @promptshield/ignore
 * - @promptshield/workspace
 *
 * This layer remains strictly orchestration and output formatting.
 */
export const runPromptShield = async (
  options: PromptshieldCliOptions,
): Promise<void> => {
  const config = deepMerge(
    DEFAULT_CONFIG,
    options,
  ) as Required<PromptshieldCliOptions>;

  const logger = createLogger({ level: config.logLevel });
  const root = process.cwd();
  const workspaceRoot = findProjectRoot(root);

  if (config.check) {
    const files = await resolveFiles(config.patterns, root);
    for (const file of files) {
      if (await isBinary(file)) {
        logger.debug(`Skipping binary file: ${relative(workspaceRoot, file)}`);
        continue;
      }
      const content = await readFile(file, "utf-8");
      const scanResult = scan(content, {
        minSeverity: config.minSeverity,
        stopOnFirstThreat: config.noInlineIgnore,
      });

      const filteredResult: FilteredThreatsResult = filterThreats(
        content,
        scanResult.threats,
        { noInlineIgnore: config.noInlineIgnore },
      );

      if (filteredResult.threats.length > 0) {
        logger.error(`Threat detected in ${relative(workspaceRoot, file)}`);
        process.exitCode = 1;
        return;
      }
    }
  }

  const isInteractive = process.stdout.isTTY;

  const updateProgress = (message: string) => {
    if (isInteractive) {
      process.stdout.write(`\r${message}`.padEnd(process.stdout.columns));
    } else {
      logger.info(message);
    }
  };

  const concurrency = Math.max(1, os.cpus().length - 1);

  /* ---------------------------------------------------------------------- */
  /*                               SANITIZE                                 */
  /* ---------------------------------------------------------------------- */

  if (config.command === "sanitize") {
    for await (const event of sanitizeWorkspace(config.patterns, root, {
      strict: config.strict,
      write: config.write,
      concurrency,
    })) {
      if (config.write) {
        const status = event.changed ? "changed" : "unchanged";
        updateProgress(
          `Sanitizing [${event.progress}%] ${event.path} (${status})`,
        );
      } else {
        if (event.changed) {
          logger.info(
            `\n\n--- ${event.path} (sanitized preview) ---\n${event.sanitized}\n\n`,
          );
        } else {
          logger.info(`\n\n--- ${event.path} (no changes) ---\n\n`);
        }
      }
    }

    console.log("\n");

    return;
  }

  /* ---------------------------------------------------------------------- */
  /*                             SCAN / FIX                                 */
  /* ---------------------------------------------------------------------- */

  const shouldApplyFixes = config.command === "fix";
  const label = shouldApplyFixes ? "Fixing" : "Scanning";
  const allThreats: Record<string, FileScanResult> = {};
  let totalThreatsCount = 0;

  const workspaceConfig: WorkspaceScanConfig = {
    minSeverity: config.minSeverity,
    noInlineIgnore: config.noInlineIgnore,
    concurrency,
    cacheMode: config.cacheMode,
    forceFullScan: config.forceFullScan,
    debug: logger.debug,
    shouldApplyFixes,
    write: config.write,
  };

  for await (const event of runWorkspaceScan(
    config.patterns,
    root,
    workspaceConfig,
  )) {
    const { path, result, progress } = event;
    const threatCount = result.threats.length;
    totalThreatsCount += threatCount;

    if (threatCount) {
      allThreats[path] = result;
    }

    updateProgress(
      `${label} [${progress}%] ${path} - ${threatCount} threats found${shouldApplyFixes ? `, ${result.fixed?.length} fixed` : ""}`,
    );
  }

  console.log("\n");

  if (config.report && totalThreatsCount > 0) {
    const reportData = Object.entries(allThreats).map(([uri, result]) => ({
      uri,
      threats: result.threats,
    }));
    await generateWorkspaceReport(workspaceRoot, reportData, totalThreatsCount);
    logger.info(
      `Generated detailed workspace report in ${PROMPTSHIELD_ARTIFACTS_DIR}/${PROMPTSHIELD_REPORT_FILE}`,
    );
  }

  if (config.json) {
    console.log(JSON.stringify(allThreats, null, 2));
  } else if (shouldApplyFixes && !config.write) {
    Object.keys(allThreats).forEach((path) => {
      const { text, fixed, skipped } = allThreats[path];
      if (fixed?.length) {
        logger.info(`\n\n--- ${path} (fixed preview) ---\n${text}\n\n`);
      } else {
        logger.info(`\n\n--- ${path} (no changes) ---\n\n`);
      }
      if (skipped?.length) {
        logger.warn(`${path}: skipped ${skipped.length} threat(s)`);
      }
    });
  } else {
    Object.keys(allThreats).forEach((path) => {
      const { threats, unusedIgnores, fixed, skipped, ignoredBySeverity } =
        allThreats[path];

      const fixedIds = new Set(fixed?.map((t) => `${t.loc.index}-${t.ruleId}`));

      threats.forEach((threat) => {
        logger[SEVERITY_TO_LOG_LEVEL[threat.severity]](
          `${path}:${threat.loc.line}:${threat.loc.column} ${threat.ruleId} ${fixedIds.has(`${threat.loc.index}-${threat.ruleId}`) ? "(fixed)" : shouldApplyFixes ? "(skipped)" : ""}\n\n${threat.message}\n\n`,
        );
      });

      unusedIgnores.forEach((rule) => {
        logger.warn(
          `${path}: Unused ignore directive at line ${rule.definedAt}`,
        );
      });

      logger.info(
        `Summary: ${path}: ${threats.length} threat(s) ${fixed?.length ? `, ${fixed.length} fixed` : ""}${skipped?.length ? `, ${skipped.length} skipped` : ""}`,
      );
      const parts = Object.entries(ignoredBySeverity)
        .filter(([, count]) => count > 0)
        .map(([severity, count]) => `${count} ${severity.toLowerCase()}`);

      if (parts.length > 0) {
        logger.warn(
          `Ignored ${parts.join(", ")} threat(s) via promptshield-ignore`,
        );
      }
    });
  }

  logger.info(`\n\nTotal Threats: ${totalThreatsCount}`);
};
