import {
  existsSync,
  mkdirSync,
  readFileSync,
  type Stats,
  writeFileSync,
} from "node:fs";
import { open, readdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { FilteredThreatsResult } from "@promptshield/ignore";
import fg from "fast-glob";
import { ACCEPTABLE_DEVIATION, CACHE_SPLIT_THRESHOLD } from "./constants";
import { atomicWrite, createLimiter, ensureDir, sha256 } from "./utils";

/**
 * Persistent cache entry representing scan results for a single file.
 *
 * Design Principles:
 * - Cache must remain configuration-agnostic.
 * - Scan results MUST be generated using `minSeverity: "LOW"`.
 * - Any severity filtering MUST occur after cache retrieval.
 *
 * Validation Strategy:
 * - An entry is considered valid only if:
 *   - File modification time (`mtimeMs`) matches
 *   - File size matches
 *
 * Rationale:
 * - This cache is an optimization layer, not a source of truth.
 * - Lightweight metadata validation is sufficient for correctness
 *   while avoiding content hashing overhead.
 *
 * Mode Differences:
 * - In `single` mode, entries are keyed by `relPath`
 *   inside a versioned `cache.json`.
 * - In `split` mode, entries are stored as individual files
 *   and include `version` and `relPath` for safe reconstruction.
 */
const CACHE_SCHEMA_VERSION = 2;

/**
 * Maximum age of a single-mode lock file before it is considered stale.
 *
 * Used to recover from:
 * - Process crashes
 * - Abrupt CLI termination
 * - CI interruptions
 *
 * If a lock file exists and its mtime exceeds this threshold,
 * it will be removed and lock acquisition retried.
 *
 * Note:
 * - This is a best-effort advisory lock.
 * - It is not a distributed or OS-level file lock.
 */
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Cache storage strategy.
 *
 * - "single":
 *   All entries stored inside one `cache.json`.
 *   Requires locking to prevent concurrent corruption.
 *   Simpler, suitable for small/medium repositories.
 *
 * - "split":
 *   One JSON file per source file (keyed by hashed relPath).
 *   No global lock required.
 *   Scales better for large repositories and parallel execution.
 *
 * - "auto":
 *   Mode determined at runtime using file-count heuristics.
 *   Designed for zero-configuration developer experience.
 */
export type CacheMode = "single" | "split" | "auto";

/**
 * Persistent cache entry representing scan results for a single file.
 *
 * Design Principles:
 * - Cache must remain configuration-agnostic.
 * - Scan results MUST be generated using `minSeverity: "LOW"`.
 * - Any severity filtering MUST occur after cache retrieval.
 *
 * Validation:
 * - Entries are considered valid only if file metadata
 *   (mtime, size, etc.) matches the current filesystem state.
 *
 * Mode Differences:
 * - In `single` mode, entries are stored inside one `cache.json`
 *   keyed by `relPath`.
 * - In `split` mode, entries are stored as individual files and
 *   MUST include `version` and `relPath` for safe reconstruction.
 *
 * Forward Compatibility:
 * - `version` enables per-entry invalidation when schema changes.
 * - Missing or mismatched version SHOULD invalidate the entry.
 */
export interface CacheEntry {
  /**
   * Schema version of this entry.
   *
   * Required in split mode.
   * Optional in single mode (version tracked at container level).
   */
  version?: number;

  /**
   * File path relative to workspace root.
   *
   * Required in split mode to:
   * - Reconstruct single-mode cache
   * - Preserve human readability
   * - Avoid irreversible hash-only storage
   */
  relPath?: string;

  /** File modification timestamp (mtimeMs). */
  mtime: number;

  /** File size in bytes. */
  size: number;

  /** Ignore-filtered scan results (minSeverity: "LOW"). */
  results: FilteredThreatsResult;
}

/**
 * Container for single-mode cache storage.
 *
 * - `version` guards the entire file structure.
 * - `entries` are keyed by relative file path.
 *
 * A version mismatch invalidates the entire cache file.
 */
interface CacheData {
  version: number;
  entries: Record<string, CacheEntry>;
}

/**
 * Configuration options for initializing CacheManager.
 *
 * @property workspaceRoot Absolute root of the project workspace.
 * @property artifactsDir  Directory (relative to workspace root)
 *                         used to persist cache artifacts.
 * @property mode          Cache storage strategy.
 * @property fileCount     Current repository file count (used for auto mode).
 * @property debug         Optional debug logger hook.
 *
 * The cache manager assumes:
 * - `workspaceRoot` remains stable during runtime.
 * - All `relPath` values are resolved relative to this root.
 */
export interface CacheManagerOptions {
  workspaceRoot: string;
  artifactsDir: string;
  mode: CacheMode;
  fileCount: number;
  debug?: null | ((msg: string) => void);
}

/**
 * Recommends optimal cache mode based on repository size.
 *
 * Heuristic:
 * - Small/medium repositories → `single`
 * - Large repositories → `split`
 *
 * This function is deterministic and side-effect free.
 * It does not perform I/O.
 */
export const recommendMode = (
  fileCount: number,
  cacheSplitThreshold = CACHE_SPLIT_THRESHOLD,
): "single" | "split" => (fileCount > cacheSplitThreshold ? "split" : "single");

/**
 * Persistent workspace-level scan cache.
 *
 * Guarantees:
 * - Atomic writes
 * - Version-aware invalidation
 * - Crash-safe single-mode locking (TTL recovery)
 * - Per-file isolation in split mode
 *
 * Non-goals:
 * - Distributed locking
 * - Cryptographic integrity guarantees
 */
export class CacheManager {
  private readonly workspaceRoot: string;
  private readonly rootDir: string;
  private readonly cacheDir: string;
  private readonly lockPath: string;

  private readonly debug?: (msg: string) => void;
  private mode: "single" | "split";
  private requestedMode: CacheMode;
  private fileCount: number;

  private cache: CacheData = {
    version: CACHE_SCHEMA_VERSION,
    entries: {},
  };

  private loadPromise: Promise<void> | null = null;

  /**
   * Creates a new CacheManager instance.
   *
   * Initialization Principles:
   * - Constructor is synchronous.
   * - No async side-effects are performed.
   * - No cache migration occurs here.
   *
   * Workspace Mode Contract:
   * - Cache mode is persisted in `.promptshield/state.json`.
   * - The workspace state is authoritative once created.
   * - All runtimes (CLI, extension, etc.) must respect it.
   *
   * Resolution Order:
   *
   * 1. If `mode !== "auto"` → use explicitly provided mode.
   * 2. Else if state file exists → use stored mode.
   * 3. Else → compute via `recommendMode(fileCount)`.
   * 4. Persist resolved mode if no state existed.
   *
   * Rationale:
   * - Prevents CLI/extension mode conflicts.
   * - Avoids split/single flip-flopping.
   * - Keeps cache storage deterministic per workspace.
   *
   * Note:
   * - Cache rebuild occurs lazily during `set()` operations.
   * - State file is lightweight and atomic.
   */
  constructor(options: CacheManagerOptions) {
    const { workspaceRoot, artifactsDir, mode, fileCount, debug } = options;

    this.workspaceRoot = workspaceRoot;
    this.rootDir = join(workspaceRoot, artifactsDir);
    this.cacheDir = join(this.rootDir, "cache");
    this.lockPath = join(this.rootDir, "cache.lock");
    this.debug = debug ?? undefined;

    const statePath = join(this.rootDir, "state.json");

    let workspaceMode: Exclude<CacheMode, "auto"> | null = null;

    // Read persisted workspace mode (if present)
    if (existsSync(statePath)) {
      try {
        const raw = readFileSync(statePath, "utf-8");
        const parsed = JSON.parse(raw) as { mode?: CacheMode };
        if (parsed.mode === "single" || parsed.mode === "split") {
          workspaceMode = parsed.mode;
        }
      } catch {
        // Non-fatal: fall back to resolution logic
      }
    }

    // Resolve mode
    const resolvedMode: Exclude<CacheMode, "auto"> =
      mode === "auto" ? (workspaceMode ?? recommendMode(fileCount)) : mode;

    this.mode = resolvedMode;
    this.requestedMode = mode;
    this.fileCount = fileCount;

    if (resolvedMode !== workspaceMode) {
      try {
        mkdirSync(this.rootDir, { recursive: true });
        writeFileSync(
          statePath,
          JSON.stringify({ mode: resolvedMode }, null, 2),
          "utf-8",
        );
      } catch {
        // Non-fatal: cache still functions without state persistence
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Internal Utilities                                                       */
  /* ------------------------------------------------------------------------ */

  private validate = (stats: Stats, entry: CacheEntry): boolean =>
    !!entry &&
    entry.version === CACHE_SCHEMA_VERSION &&
    stats.mtimeMs === entry.mtime &&
    stats.size === entry.size;

  /* ------------------------------------------------------------------------ */
  /* Locking (Single Mode Only)                                              */
  /* ------------------------------------------------------------------------ */

  private acquireLock = async (): Promise<boolean> => {
    try {
      const handle = await open(this.lockPath, "wx");
      await handle.write(JSON.stringify({ pid: process.pid, ts: Date.now() }));
      await handle.close();
      return true;
    } catch {
      try {
        const stats = await stat(this.lockPath);
        const age = Date.now() - stats.mtimeMs;

        if (age > LOCK_TTL_MS) {
          await rm(this.lockPath, { force: true });
          return this.acquireLock();
        }
      } catch {
        // ignore
      }
      return false;
    }
  };

  private releaseLock = async (): Promise<void> => {
    await rm(this.lockPath, { force: true }).catch(() => {});
  };

  /* ------------------------------------------------------------------------ */
  /* Single Mode Load                                                         */
  /* ------------------------------------------------------------------------ */

  private loadSingle = async (): Promise<void> => {
    if (this.loadPromise) return this.loadPromise;

    const filePath = join(this.rootDir, "cache.json");

    this.loadPromise = readFile(filePath, "utf-8")
      .then((raw) => {
        const parsed = JSON.parse(raw) as CacheData;
        if (parsed.version === CACHE_SCHEMA_VERSION) this.cache = parsed;
      })
      .catch(() => {
        this.cache = {
          version: CACHE_SCHEMA_VERSION,
          entries: {},
        };
      });

    return this.loadPromise;
  };

  /* ------------------------------------------------------------------------ */
  /* Public API                                                               */
  /* ------------------------------------------------------------------------ */

  get = async (relPath: string): Promise<FilteredThreatsResult | null> => {
    try {
      const absPath = join(this.workspaceRoot, relPath);
      const stats = await stat(absPath);

      if (this.mode === "single") {
        await this.loadSingle();
        const entry = this.cache.entries[relPath];
        return this.validate(stats, { ...entry, version: this.cache.version })
          ? entry.results
          : null;
      }

      const filePath = join(this.cacheDir, `${sha256(relPath)}.json`);
      const entry = JSON.parse(await readFile(filePath, "utf-8")) as CacheEntry;

      return this.validate(stats, entry) ? entry.results : null;
    } catch {
      return null;
    }
  };

  set = async (
    relPath: string,
    results: FilteredThreatsResult,
    fileCount?: number,
  ): Promise<void> => {
    if (fileCount) this.fileCount = fileCount;
    try {
      const absPath = join(this.workspaceRoot, relPath);
      const stats = await stat(absPath);

      const entry: CacheEntry = {
        mtime: stats.mtimeMs,
        size: stats.size,
        results,
      };

      if (this.mode === "single") {
        if (!(await this.acquireLock())) return;

        try {
          await this.loadSingle();
          this.cache.entries[relPath] = entry;
          await ensureDir(this.rootDir);
          await atomicWrite(
            join(this.rootDir, "cache.json"),
            JSON.stringify(this.cache),
          );
        } finally {
          await this.releaseLock();
        }
        return;
      }

      await ensureDir(this.cacheDir);
      await atomicWrite(
        join(this.cacheDir, `${sha256(relPath)}.json`),
        JSON.stringify({ ...entry, version: CACHE_SCHEMA_VERSION, relPath }),
      );
    } catch {
      this.debug?.("Cache write failed");
    }
  };

  clear = async (): Promise<void> => {
    await rm(this.cacheDir, { recursive: true, force: true });
    await rm(join(this.rootDir, "cache.json"), { force: true });
    await rm(join(this.rootDir, "state.json"), { force: true });
    // Clean up tmp files
    fg(["**/*.tmp"], {
      cwd: this.rootDir,
      dot: true,
      onlyFiles: true,
      absolute: true,
    }).then((files) => {
      files.forEach((file) => {
        rm(file, { force: true });
      });
    });
    // Recreate state.json
    await atomicWrite(
      join(this.rootDir, "state.json"),
      JSON.stringify({
        mode:
          this.requestedMode === "auto"
            ? recommendMode(this.fileCount)
            : this.requestedMode,
      }),
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Migration Helpers                                                        */
  /* ------------------------------------------------------------------------ */

  /**
   * Determines whether the current cache strategy should be reconsidered
   * based on repository size drift.
   *
   * Heuristic:
   * - Computes the recommended mode using `recommendMode(fileCount)`.
   * - Compares the current mode against the recommended one.
   * - Suppresses recommendations if the file count deviation from
   *   `SPLIT_FILE_COUNT_BOUNDARY` is within `ACCEPTABLE_DEVIATION`.
   *
   * Rationale:
   * - Prevents noisy flip-flopping near the boundary threshold.
   * - Provides stable behavior when repository size fluctuates slightly.
   *
   * Returns:
   * - `"single"` or `"split"` → when a strategy switch is advisable.
   * - `false` → when current mode remains appropriate.
   *
   * Notes:
   * - Does not mutate internal state.
   * - Intended for advisory use (CLI warnings, IDE notifications).
   */
  shouldRecommendModeSwitch = (
    fileCount?: number,
    acceptableDeviation = ACCEPTABLE_DEVIATION,
    cacheSplitThreshold = CACHE_SPLIT_THRESHOLD,
  ): Exclude<CacheMode, "auto"> | false => {
    const resolvedFilecount = fileCount ?? this.fileCount;
    const suggestedMode = recommendMode(resolvedFilecount, cacheSplitThreshold);

    const deviationRatio =
      Math.abs(resolvedFilecount - cacheSplitThreshold) / cacheSplitThreshold;

    if (this.mode === suggestedMode || deviationRatio < acceptableDeviation) {
      return false;
    }

    return suggestedMode;
  };

  /**
   * Merges all split-mode cache entries into a single `cache.json`.
   *
   * Purpose:
   * - Converts per-file hashed cache artifacts into a unified
   *   single-file cache representation.
   * - Typically used during storage strategy migration.
   *
   * Behavior:
   * - No-op unless current mode is `"split"`.
   * - Reads all files inside `cacheDir`.
   * - Validates each entry against `CACHE_SCHEMA_VERSION`.
   * - Reconstructs the single-mode structure keyed by `relPath`.
   * - Writes the merged result atomically to `cache.json`.
   *
   * Concurrency:
   * - File reads are processed using a bounded concurrency limiter.
   * - Prevents unbounded parallel I/O on large repositories.
   *
   * Validation:
   * - Entries with mismatched or missing schema versions are skipped.
   * - Invalid entries are not migrated.
   *
   * Guarantees:
   * - Atomic write prevents partial or corrupted `cache.json`.
   * - Resulting file is compatible with single-mode loading logic.
   *
   * Non-Goals:
   * - Does not delete split artifacts.
   * - Does not mutate current mode.
   */

  mergeSplitToSingle = async (): Promise<void> => {
    if (this.mode !== "split") return;

    const files = await readdir(this.cacheDir).catch(() => []);
    const limit = createLimiter(12);

    const merged: CacheData = {
      version: CACHE_SCHEMA_VERSION,
      entries: {},
    };

    await Promise.all(
      files.map((file) =>
        limit(async () => {
          const raw = await readFile(join(this.cacheDir, file), "utf-8");
          const { version, relPath, ...entry } = JSON.parse(
            raw,
          ) as Required<CacheEntry>;
          if (
            version === CACHE_SCHEMA_VERSION &&
            typeof relPath === "string" &&
            relPath
          ) {
            merged.entries[relPath] = entry;
          }
        }),
      ),
    );

    await atomicWrite(join(this.rootDir, "cache.json"), JSON.stringify(merged));
    this.mode = "single";
    await atomicWrite(
      join(this.rootDir, "state.json"),
      JSON.stringify({ mode: this.mode }),
    );
  };

  /**
   * Splits a single `cache.json` into per-file hashed cache entries.
   *
   * Purpose:
   * - Converts single-mode cache into split-mode storage.
   * - Enables better scalability for large repositories.
   *
   * Behavior:
   * - No-op unless current mode is `"single"`.
   * - Loads in-memory single cache.
   * - Creates `cacheDir` if missing.
   * - Writes one JSON file per entry using `sha256(relPath)` as filename.
   *
   * Storage Format:
   * - Each split file includes:
   *   - `version` (schema guard)
   *   - `relPath` (for reverse reconstruction)
   *   - file metadata and scan results
   *
   * Concurrency:
   * - Writes are executed using bounded parallelism
   *   to avoid filesystem saturation.
   *
   * Guarantees:
   * - Atomic writes prevent partial entry corruption.
   * - Resulting split entries are fully reconstructable.
   *
   * Non-Goals:
   * - Does not remove the original `cache.json`.
   * - Does not change current cache mode.
   */
  splitSingleToSplit = async (): Promise<void> => {
    if (this.mode !== "single") return;

    await this.loadSingle();
    await ensureDir(this.cacheDir);

    const limit = createLimiter(12);

    await Promise.all(
      Object.entries(this.cache.entries).map(([relPath, entry]) =>
        limit(async () => {
          const target = join(this.cacheDir, `${sha256(relPath)}.json`);
          await atomicWrite(
            target,
            JSON.stringify({ ...entry, relPath, version: this.cache.version }),
          );
        }),
      ),
    );

    this.mode = "split";
    await atomicWrite(
      join(this.rootDir, "state.json"),
      JSON.stringify({ mode: this.mode }),
    );
  };
}
