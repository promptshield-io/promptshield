import { readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import {
  SEVERITY_MAP,
  type Severity,
  scan,
  type ThreatReport,
} from "@promptshield/core";
import {
  type FilteredThreatsResult,
  filterThreats,
} from "@promptshield/ignore";
import {
  applyFixes,
  type FixResult,
  sanitize,
  sanitizeStrict,
} from "@promptshield/sanitizer";
import { CacheManager, type CacheMode } from "./cache";
import {
  PROMPTSHIELD_ARTIFACTS_DIR,
  PROMPTSHIELD_REPORT_FILE,
} from "./constants";
import { resolveFiles } from "./resolve-files";
import { atomicWrite, createLimiter, isBinary } from "./utils";

/* -------------------------------------------------------------------------- */
/*                                Configuration                               */
/* -------------------------------------------------------------------------- */

/**
 * Configuration for workspace scan orchestration.
 */
export interface WorkspaceScanConfig {
  /**
   * Minimum severity threshold to report.
   *
   * Note:
   * When caching is enabled (`cacheMode !== "none"`),
   * scanning is always performed with `minSeverity: "LOW"`
   * internally. This threshold is applied after cache retrieval.
   *
   * @default "LOW"
   */
  minSeverity?: Severity;

  /**
   * Disable inline `promptshield-ignore` directives.
   *
   * Does NOT affect file-level ignore rules defined in
   * `.gitignore`, `.promptshieldignore`, or `.psignore`.
   *
   * Note:
   * When caching is enabled (`cacheMode !== "none"`),
   * inline ignore directives are always computed internally.
   * This flag only affects how results are presented.
   *
   * @default false
   */
  noInlineIgnore?: boolean;

  /**
   * Maximum number of files processed concurrently.
   *
   * @default 4
   */
  concurrency?: number;

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
   * Optional debug logger hook.
   */
  debug?: null | ((msg: string) => void);

  /**
   * Internal flag used by `scanAndFixWorkspace`.
   * Consumers should prefer the dedicated fix API.
   *
   * @default false
   */
  shouldApplyFixes?: boolean;

  /**
   * Write fixed files to disk. Only relevant when `shouldApplyFixes` is enabled.
   *
   * @default false
   */
  write?: boolean;
}

const DEFAULT_CONFIG: Required<WorkspaceScanConfig> = {
  minSeverity: "LOW",
  noInlineIgnore: false,
  concurrency: 4,
  cacheMode: "auto",
  forceFullScan: false,
  debug: null,
  shouldApplyFixes: false,
  write: false,
};

/* -------------------------------------------------------------------------- */
/*                                   Events                                   */
/* -------------------------------------------------------------------------- */

export type FileScanResult = FilteredThreatsResult & Partial<FixResult>;

/**
 * A discrete event yielded during the workspace scan.
 */
export interface ScanEvent {
  /**
   * Normalized, workspace-relative file path.
   * Always POSIX-style for cross-platform consistency.
   */
  path: string;

  /**
   * Human-friendly file name (no directories).
   */
  name: string;

  /**
   * Filtered scan outcome.
   * Includes detected threats and ignore-rule metadata.
   */
  result: FileScanResult;

  /**
   * Overall scan progress (0–100).
   * Intended for UI / CLI progress reporting.
   */
  progress: number;
}

/* -------------------------------------------------------------------------- */
/*                                File Scanner                                */
/* -------------------------------------------------------------------------- */

/**
 * Scans a single file with optional caching and presentation filtering.
 *
 * Invariants:
 * - Binary files are skipped and return an empty result.
 * - When caching is enabled, baseline scan always runs with
 *   `minSeverity: "LOW"` and inline ignores enabled.
 * - Presentation filtering is applied after cache retrieval.
 * - Cache writes are fire-and-forget and never block execution.
 * Returns `null` if file is binary or scan fails.
 *
 * Fix Semantics:
 * - When `shouldApplyFixes` is enabled, fixes are applied
 *   immediately after scanning and cache is updated.
 */
export const scanFile = async (
  filePath: string,
  root: string,
  options: {
    cache: CacheManager | null;
    baselineMinSeverity: Severity;
    minSeverity: Severity;
    noInlineIgnore: boolean;
    fileCount?: number;
    shouldApplyFixes?: boolean;
    write?: boolean;
  },
): Promise<{ relPath: string; result: FileScanResult }> => {
  const {
    cache,
    baselineMinSeverity,
    minSeverity,
    noInlineIgnore,
    fileCount,
    shouldApplyFixes,
    write,
  } = options;

  const relPath = relative(root, filePath).replace(/\\/g, "/");

  const emptyResult: FilteredThreatsResult = {
    threats: [],
    ignoredThreats: [],
    unusedIgnores: [],
    ignoredBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  };

  let filtered = await cache?.get(relPath);
  let threats: ThreatReport[] = [];
  let content: string | undefined;

  if (!filtered) {
    if (await isBinary(filePath)) {
      return { relPath, result: emptyResult };
    }

    content = await readFile(filePath, "utf-8");
    threats = scan(content, { minSeverity: baselineMinSeverity }).threats;
    filtered = filterThreats(content, threats);

    /**
     * Intentionally fire-and-forget.
     *
     * Cache persistence is best-effort and must never block
     * scan throughput or affect correctness.
     */
    cache?.set(relPath, filtered, fileCount);
  } else {
    threats = [...filtered.threats, ...filtered.ignoredThreats].toSorted(
      (a, b) => a.range.start.index - b.range.start.index,
    );
  }

  const result: FileScanResult = noInlineIgnore
    ? { ...emptyResult, threats }
    : structuredClone(filtered);

  // Apply presentation severity filtering.
  if (cache && minSeverity !== "LOW") {
    result.threats = result.threats.filter(
      (t) => SEVERITY_MAP[t.severity] <= SEVERITY_MAP[minSeverity],
    );
    result.ignoredThreats = result.ignoredThreats.filter(
      (t) => SEVERITY_MAP[t.severity] <= SEVERITY_MAP[minSeverity],
    );

    (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[])
      .slice(SEVERITY_MAP[minSeverity])
      .forEach((s) => {
        result.ignoredBySeverity[s] = 0;
      });
  }

  /* ------------------------------ Fix Handling ----------------------------- */

  if (shouldApplyFixes && result.threats.length > 0) {
    const fileContent =
      content ?? (await readFile(join(root, relPath), "utf-8"));

    const { text, fixed, skipped } = await applyFixes(
      fileContent,
      result.threats,
    );

    if (text !== fileContent && write) {
      await atomicWrite(join(root, relPath), text);

      const fixedIds = new Set(
        fixed.map((t) => `${t.range.start.index}-${t.ruleId}`),
      );

      filtered.threats = filtered.threats.filter(
        (t) => !fixedIds.has(`${t.range.start.index}-${t.ruleId}`),
      );

      cache?.set(relPath, filtered);
    }
    result.fixed = fixed;
    result.skipped = skipped;
    result.text = text === fileContent ? undefined : text;
  }

  return { relPath, result };
};

/* -------------------------------------------------------------------------- */
/*                             Workspace Orchestrator                         */
/* -------------------------------------------------------------------------- */

/**
 * Internal workspace pipeline engine.
 *
 * Responsibilities:
 * - Resolve file globs
 * - Initialize cache strategy
 * - Enforce bounded concurrency
 * - Stream scan events
 *
 * Results are yielded in task creation order (not completion order).
 */
export async function* runWorkspaceScan(
  patterns: string[],
  root: string,
  config: WorkspaceScanConfig,
): AsyncGenerator<ScanEvent> {
  const files = await resolveFiles(patterns, root);
  if (files.length === 0) return;

  const {
    cacheMode,
    forceFullScan,
    minSeverity,
    noInlineIgnore,
    concurrency,
    shouldApplyFixes,
    write,
  } = { ...DEFAULT_CONFIG, ...config };

  const cache =
    cacheMode === "none"
      ? null
      : new CacheManager({
          workspaceRoot: root,
          artifactsDir: PROMPTSHIELD_ARTIFACTS_DIR,
          mode: cacheMode,
          fileCount: files.length,
          debug: config.debug,
        });

  if (forceFullScan) {
    await cache?.clear();
  }

  const limiter = createLimiter(concurrency);
  const baselineMinSeverity = cache ? "LOW" : minSeverity;

  let processedCount = 0;

  const tasks = files.map((filePath) =>
    limiter(async (): Promise<ScanEvent | null> => {
      try {
        const { relPath, result } = await scanFile(filePath, root, {
          cache,
          baselineMinSeverity,
          minSeverity,
          noInlineIgnore,
          fileCount: files.length,
          shouldApplyFixes,
          write,
        });

        processedCount++;

        return {
          path: relPath,
          name: basename(filePath),
          result,
          progress: Math.round((processedCount / files.length) * 100),
        };
      } catch (error) {
        console.error("PromptShield: Scan failed for file", filePath, error);
        return null;
      }
    }),
  );

  for (const task of tasks) {
    const event = await task;
    if (event) yield event;
  }
}

/* -------------------------------------------------------------------------- */
/*                           Public API: Scan / Fix                           */
/* -------------------------------------------------------------------------- */

/**
 * Scans a workspace using a high-concurrency Async Generator.
 *
 * This orchestrator bridges `@promptshield/core` and the filesystem,
 * providing real-time feedback suitable for CLI progress bars
 * and LSP diagnostics.
 *
 * Execution Model:
 * - Files are processed concurrently (bounded by `concurrency`).
 * - Results are yielded in task-creation order (not completion order).
 *
 * Cache Semantics:
 * - When caching is enabled, baseline results are computed using
 *   `minSeverity: "LOW"` with inline ignores enabled.
 * - Presentation-level filtering (`minSeverity`, `noInlineIgnore`)
 *   is applied after cache retrieval.
 * - Cache writes are intentionally NOT awaited. This is a deliberate
 *   performance trade-off to avoid blocking scan throughput.
 *   Cache persistence is best-effort and not part of scan correctness.
 *
 * @example
 * ```ts
 * for await (const { path, result, progress } of scanWorkspace(['**\/*.js'], root)) {
 *   console.log(`[${progress}%] Scanned ${path}: ${result.threats.length} threats`);
 * }
 * ```
 */
export const scanWorkspace = (
  patterns: string[],
  root: string,
  config: Omit<WorkspaceScanConfig, "shouldApplyFixes" | "write"> = {},
): AsyncGenerator<ScanEvent> =>
  runWorkspaceScan(patterns, root, {
    ...config,
    shouldApplyFixes: false,
  });

/**
 * Scan a workspace and apply available fixes.
 *
 * This is a convenience wrapper over the core scan pipeline.
 */
export const scanAndFixWorkspace = (
  patterns: string[],
  root: string,
  config: Omit<WorkspaceScanConfig, "shouldApplyFixes"> = {},
): AsyncGenerator<ScanEvent> =>
  runWorkspaceScan(patterns, root, {
    ...config,
    shouldApplyFixes: true,
  });

/* -------------------------------------------------------------------------- */
/*                                Sanitization                               */
/* -------------------------------------------------------------------------- */

/**
 * Configuration for workspace-level sanitization.
 *
 * All options default to safe, non-destructive behavior.
 */
export interface SanitizeWorkspaceConfig {
  /**
   * Enable strict sanitization mode.
   *
   * When enabled:
   * - The strict sanitizer implementation is used.
   * - Strict nomalization is applied.
   *
   * @default false
   */
  strict?: boolean;

  /**
   * Persist sanitized content to disk.
   *
   * When disabled, sanitization runs in dry-run mode.
   *
   * @default false
   */
  write?: boolean;

  /**
   * Maximum number of files processed concurrently.
   *
   * Controls I/O parallelism.
   *
   * @default 4
   */
  concurrency?: number;
}

/**
 * Event emitted for each processed file during workspace sanitization.
 */
export interface SanitizeEvent {
  /**
   * Workspace-relative, POSIX-normalized file path.
   */
  path: string;

  /**
   * Human-readable file name (without directories).
   */
  name: string;

  /**
   * Indicates whether the sanitizer modified the file content.
   *
   * In dry-run mode (`write: false`), this reflects whether
   * changes would have occurred.
   */
  changed: boolean;

  /**
   * Overall progress percentage (0–100).
   *
   * Progress is monotonic and based on total resolved files.
   */
  progress: number;

  /**
   * Sanitized text.
   */
  sanitized: string;
}

/**
 * Sanitize files in a workspace using glob patterns.
 *
 * Responsibilities:
 * - Resolve file patterns
 * - Apply sanitizer (strict or standard)
 * - Optionally persist changes
 * - Emit progress events per file
 *
 * Execution Model:
 * - Files are processed concurrently (bounded by `concurrency`).
 * - Results are yielded in task-creation order.
 *
 * Invariants:
 * - Files are read using UTF-8 encoding.
 * - Writes occur only when `write === true`
 *   and sanitized output differs from original content.
 * - Progress is deterministic and capped at 100.
 *
 * @param patterns Glob patterns resolved relative to `root`.
 * @param root Absolute workspace root directory.
 * @param config Sanitization behavior configuration.
 */
export async function* sanitizeWorkspace(
  patterns: string[],
  root: string,
  config: SanitizeWorkspaceConfig = {},
): AsyncGenerator<SanitizeEvent> {
  const { strict = false, write = false, concurrency = 4 } = config;

  const sanitizer = strict ? sanitizeStrict : sanitize;
  const files = await resolveFiles(patterns, root);

  if (files.length === 0) return;

  const limiter = createLimiter(concurrency);
  let processed = 0;

  const tasks = files.map((file) =>
    limiter(async (): Promise<SanitizeEvent> => {
      const content = await readFile(file, "utf-8");
      const sanitized = sanitizer(content);

      const changed = sanitized !== content;

      if (write && changed) {
        await atomicWrite(file, sanitized);
      }

      processed++;

      return {
        path: relative(root, file).replace(/\\/g, "/"),
        name: basename(file),
        changed,
        sanitized,
        progress: Math.round((processed / files.length) * 100),
      };
    }),
  );

  for (const task of tasks) {
    yield await task;
  }
}

/* -------------------------------------------------------------------------- */
/*                              Report Generation                             */
/* -------------------------------------------------------------------------- */

/**
 * Generate a Markdown workspace scan report.
 *
 * The report is written to:
 * `<workspaceRoot>/<PROMPTSHIELD_ARTIFACTS_DIR>/workspace-report.md`
 *
 * The file includes:
 * - Timestamp
 * - Total threat count
 * - Affected file count
 * - Grouped threats by file and line number
 *
 * Existing reports are overwritten.
 */
const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const SEVERITY_ICON: Record<Severity, string> = {
  CRITICAL: "🚨",
  HIGH: "🔥",
  MEDIUM: "⚠️",
  LOW: "💡",
};

export const generateWorkspaceReport = async (
  rootPath: string,
  allThreats: { uri: string; threats: ThreatReport[] }[],
  threatsFound: number,
  reportFileName = PROMPTSHIELD_REPORT_FILE,
): Promise<void> => {
  const reportPath = join(rootPath, PROMPTSHIELD_ARTIFACTS_DIR, reportFileName);

  let md = `# 🛡️ PromptShield Workspace Report\n\n`;
  md += `**Date:** ${new Date().toLocaleString()}  \n`;
  md += `**Total Threats:** ${threatsFound}  \n`;
  md += `**Files Affected:** ${allThreats.length}\n\n---\n\n`;

  if (allThreats.length === 0) {
    md += `✅ No threats detected.\n`;
    await atomicWrite(reportPath, md);
    return;
  }

  for (const ft of allThreats) {
    const fileUri = pathToFileURL(join(rootPath, ft.uri)).toString();

    const bySeverity = new Map<Severity, ThreatReport[]>();
    for (const s of SEVERITY_ORDER) bySeverity.set(s, []);
    for (const t of ft.threats) bySeverity.get(t.severity)?.push(t);

    const summaryParts = SEVERITY_ORDER.filter(
      (s) => (bySeverity.get(s)?.length ?? 0) > 0,
    ).map(
      (s) => `${bySeverity.get(s)?.length} ${s[0]}${s.slice(1).toLowerCase()}`,
    );

    md += `<details>\n<summary><b>📄 [${ft.uri}](${fileUri}) — ${summaryParts.join(", ")}</b></summary>\n\n`;

    for (const severity of SEVERITY_ORDER) {
      const group = bySeverity.get(severity);
      if (!group?.length) continue;

      const icon = SEVERITY_ICON[severity];

      md += `<details style="padding-left:1rem">\n<summary>${icon} <strong>${severity}</strong> — ${group.length} threat${group.length > 1 ? "s" : ""}</summary>\n\n`;

      const byLine = new Map<number, ThreatReport[]>();
      for (const t of group) {
        if (!byLine.has(t.range.start.line)) byLine.set(t.range.start.line, []);
        byLine.get(t.range.start.line)?.push(t);
      }

      for (const [line, threats] of [...byLine.entries()].sort(
        ([a], [b]) => a - b,
      )) {
        md += `<details style="padding-left:1rem">\n<summary>Line ${line} — ${threats.length} threat${threats.length > 1 ? "s" : ""}</summary>\n\n`;

        for (const threat of threats) {
          md += `- **${threat.category}** \`${threat.ruleId}\`: ${threat.message}`;
          if (threat.readableLabel)
            md += ` (Hidden: \`${threat.readableLabel}\`)`;
          md += "\n";
        }

        md += `\n</details>\n\n`;
      }

      md += `</details>\n\n`;
    }

    md += `</details>\n\n`;
  }

  await atomicWrite(reportPath, md);
};
