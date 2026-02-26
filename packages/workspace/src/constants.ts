/**
 * Default ignore file names recognized by PromptShield.
 *
 * Resolution Order:
 * - Project-specific ignore files override generic ones.
 *
 * Supported:
 * - `.gitignore` → fallback compatibility
 * - `.promptshieldignore` → primary configuration file
 * - `.psignore` → short alias
 *
 * Notes:
 * - These files are resolved relative to workspace root.
 * - First match does not stop resolution; merging behavior
 *   is implementation-defined.
 */
export const IGNORE_FILES = [
  ".gitignore",
  ".promptshieldignore",
  ".psignore",
] as const;

/**
 * Languages treated as text sources for scanning.
 *
 * Purpose:
 * - Restricts analysis to textual formats.
 * - Prevents binary file misclassification.
 *
 * Source:
 * - Typically aligned with VSCode language identifiers.
 *
 * Notes:
 * - This list is intentionally explicit.
 * - Adding a language increases scan surface area.
 * - Binary detection should still run independently.
 * - Currently not used
 */
export const TEXT_LANGUAGES = [
  "plaintext",
  "markdown",
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
  "json",
  "jsonc",
  "yaml",
  "toml",
  "xml",
  "html",
  "css",
  "scss",
  "less",
  "shellscript",
  "python",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
] as const;

/**
 * Directory name used to store PromptShield artifacts.
 *
 * Contains:
 * - Cache files
 * - Lock files
 * - Derived metadata
 *
 * This directory is created inside the workspace root.
 */
export const PROMPTSHIELD_ARTIFACTS_DIR = ".promptshield";

/**
 * Default file name for the workspace report.
 */
export const PROMPTSHIELD_REPORT_FILE = "workspace-report.md";

/**
 * File-count threshold for recommending split cache mode.
 *
 * If total repository file count exceeds this value,
 * split-mode storage is preferred for scalability.
 *
 * Rationale:
 * - Large repositories suffer from single-file rewrite overhead.
 * - Split mode reduces contention and memory footprint.
 *
 * This is a heuristic boundary, not a hard limit.
 */
export const CACHE_SPLIT_THRESHOLD = 1500;

/**
 * Hysteresis ratio applied when recommending cache strategy changes.
 *
 * Purpose:
 * - Prevents rapid mode switching near threshold boundary.
 *
 * Example:
 * - With threshold 1500 and ratio 0.2:
 *   - Switching to split requires > 1800 files.
 *   - Switching back requires < 1200 files.
 *
 * Expressed as a fractional deviation (0.2 = 20%).
 */
export const ACCEPTABLE_DEVIATION = 0.2;
