import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import fg from "fast-glob";
import ignore from "ignore";

/**
 * Loads ignore rules for PromptShield workspace scanning.
 *
 * This function aggregates ignore patterns from well-known files
 * in the project root and returns a configured matcher compatible
 * with gitignore-style semantics.
 *
 * Files loaded (in order):
 * - `.gitignore`
 * - `.promptshieldignore`
 * - `.psignore`
 *
 * Missing files are silently ignored.
 *
 * @param root - Absolute path to the workspace root.
 * @returns A configured ignore matcher instance.
 */
const loadIgnore = async (root: string) => {
  const ig = ignore();

  /**
   * Attempts to load ignore patterns from a file.
   * Failures (e.g., file not found) are intentionally ignored.
   */
  const tryLoad = async (file: string) => {
    try {
      const content = await readFile(join(root, file), "utf-8");
      ig.add(content);
    } catch {
      // Intentionally ignore missing or unreadable files.
    }
  };

  // Default ignores
  ig.add([".promptshield-cache.json", "promptshield.report.md"]);

  await tryLoad(".gitignore");
  await tryLoad(".promptshieldignore");
  await tryLoad(".psignore");

  return ig;
};

/**
 * Resolves workspace files matching the provided glob patterns
 * while respecting PromptShield and gitignore rules.
 *
 * Behavior:
 * - Uses fast-glob for file discovery
 * - Applies ignore filtering using gitignore semantics
 * - Returns absolute file paths
 * - Falls back to a default pattern when none provided
 *
 * @param patterns - Glob patterns relative to the workspace root.
 * @param root - Absolute workspace root directory.
 * @returns List of absolute file paths eligible for scanning.
 */
export const resolveFiles = async (patterns: string[], root: string) => {
  if (!patterns.length) {
    patterns = ["**/*.{ts,tsx,js,jsx,md,txt,json}"];
  }

  const ig = await loadIgnore(root);

  const files = await fg(patterns, {
    cwd: root,
    dot: false,
    onlyFiles: true,
    absolute: true,
  });

  return files.filter(
    (file) => !ig.ignores(relative(root, file).replace(/\\/g, "/")),
  );
};
