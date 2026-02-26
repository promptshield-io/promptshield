import { readFile } from "node:fs/promises";
import { dirname, relative } from "node:path";
import fg from "fast-glob";
import ignore, { type Ignore } from "ignore";
import { IGNORE_FILES, PROMPTSHIELD_ARTIFACTS_DIR } from "./constants";

/**
 * Loads hierarchical ignore rules for a workspace.
 *
 * This function emulates Git-style ignore behavior with the following rules:
 *
 * - All supported ignore files are discovered recursively.
 * - Ignore files are applied in parent → child directory order.
 * - Patterns are scoped relative to the directory containing the ignore file.
 * - Negation rules (`!pattern`) are preserved and scoped correctly.
 * - PromptShield artifact directory is always ignored.
 *
 * Notes:
 * - Full Git parity is intentionally not attempted (Git’s engine is complex).
 * - The `ignore` package handles glob semantics including `**`, `*`, `?`,
 *   directory-only rules, and negation precedence.
 *
 * @param root - Absolute workspace root.
 * @returns Configured Ignore matcher.
 */
const loadIgnore = async (root: string): Promise<Ignore> => {
  const ig = ignore();

  // Always ignore PromptShield artifact directory
  ig.add([`**/${PROMPTSHIELD_ARTIFACTS_DIR}/**`]);

  /**
   * Discover ignore files recursively.
   *
   * We intentionally load all supported ignore files across the tree.
   */
  const ignorePaths = await fg(
    IGNORE_FILES.map((name) => `**/${name}`),
    {
      cwd: root,
      dot: true,
      onlyFiles: true,
      absolute: true,
    },
  );

  /**
   * Sort by directory depth (parent → child).
   * This preserves Git-like precedence semantics.
   */
  ignorePaths.sort((a, b) => a.split(/[\\/]/).length - b.split(/[\\/]/).length);

  for (const absPath of ignorePaths) {
    try {
      const content = await readFile(absPath, "utf-8");

      const relDir = relative(root, dirname(absPath)).replace(/\\/g, "/");

      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

      /**
       * Scope patterns relative to ignore file directory.
       *
       * Rules:
       * - `pattern`      → `${relDir}/pattern`
       * - `/pattern`     → `${relDir}/pattern`
       * - `!pattern`     → `!${relDir}/pattern`
       * - `!/pattern`    → `!${relDir}/pattern`
       */
      const scopedPatterns =
        relDir === ""
          ? lines
          : lines.map((pattern) => {
              const isNegated = pattern.startsWith("!");
              const raw = isNegated ? pattern.slice(1) : pattern;

              const scoped = raw.startsWith("/")
                ? `${relDir}${raw}`
                : `${relDir}/${raw}`;

              return isNegated ? `!${scoped}` : scoped;
            });

      ig.add(scopedPatterns);
    } catch {
      // Unreadable ignore files are silently skipped.
      // Ignore resolution must never crash workspace scanning.
    }
  }

  return ig;
};

/**
 * Resolves workspace files using glob patterns while respecting
 * hierarchical ignore rules.
 *
 * Behavior:
 * - Uses `fast-glob` for discovery.
 * - Applies ignore matcher after resolution.
 * - Returns absolute file paths.
 *
 * @param patterns - Glob patterns relative to workspace root.
 * @param root - Absolute workspace root.
 * @returns Absolute file paths eligible for scanning.
 */
export const resolveFiles = async (
  patterns: string[],
  root: string,
): Promise<string[]> => {
  const globs = patterns.length > 0 ? patterns : ["**/*"];

  const ig = await loadIgnore(root);

  const files = await fg(globs, {
    cwd: root,
    dot: false,
    onlyFiles: true,
    absolute: true,
  });

  return files.filter(
    (file) => !ig.ignores(relative(root, file).replace(/\\/g, "/")),
  );
};
