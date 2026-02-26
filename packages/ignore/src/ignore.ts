import type { Severity, ThreatReport } from "@promptshield/core";

/** VSCode position */
interface Position {
  line: number;
  character: number;
}

/**
 * Represents a single inline ignore directive range.
 *
 * All line numbers are 1-based.
 * `definedAt` is a character offset within the original text,
 * used for precise editor diagnostics.
 */
interface IgnoreRange {
  /** First ignored line (inclusive). */
  start: number;

  /** Last ignored line (inclusive). */
  end: number;

  /** Absolute character offset where directive was defined. */
  definedAt: {
    start: Position;
    end: Position;
  };

  /** Internal flag used during filtering to mark usage. */
  used?: boolean;
}

/**
 * Result of parsing ignore directives from a document.
 */
interface IgnoreParseResult {
  /** Whether entire file should be ignored. */
  ignoreFile: boolean;

  /** Inline ignore ranges. */
  ranges: IgnoreRange[];
}

/**
 * Final filtered result after applying ignore rules.
 */
export interface FilteredThreatsResult {
  threats: ThreatReport[];
  ignoredThreats: ThreatReport[];
  unusedIgnores: Omit<IgnoreRange, "used">[];
  ignoredBySeverity: Record<Severity, number>;
}

/**
 * INTERNAL
 *
 * Parses `promptshield-ignore` directives from raw text.
 *
 * Supported forms:
 *
 * - `promptshield-ignore all`
 *   → Must appear near top of file (first 10 lines).
 *
 * - `promptshield-ignore next N`
 *   → Ignores the next N lines (default 1).
 *
 * - `promptshield-ignore`
 *   → Ignores current line (if inline) or next line (if standalone comment).
 *
 * Design Notes:
 * - Parsing is lightweight and line-based.
 * - Character offsets (`definedAt`) are computed using
 *   accumulated line offsets for accurate diagnostics.
 * - Line numbers are 1-based.
 */
const parseIgnoreDirectives = (text: string): IgnoreParseResult => {
  const lines = text.split(/\r?\n/);

  const ranges: IgnoreRange[] = [];
  let ignoreFile = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const lineNo = i + 1;

    const directiveIndex = raw.indexOf("promptshield-ignore");

    if (directiveIndex === -1) continue;

    // Whole-file ignore (must appear near top)
    if (trimmed.includes("promptshield-ignore all") && lineNo <= 10) {
      ignoreFile = true;
      continue;
    }

    // `next N`
    const nextMatch = trimmed.match(/promptshield-ignore\s+next\s*(\d+)?/);

    if (nextMatch) {
      const count = Math.max(nextMatch[1] ? parseInt(nextMatch[1], 10) : 1, 1);

      ranges.push({
        start: lineNo + 1,
        end: lineNo + count,
        definedAt: {
          start: {
            line: lineNo - 1,
            character: directiveIndex,
          },
          end: {
            line: lineNo - 1,
            character: directiveIndex + nextMatch[0].length,
          },
        },
      });

      continue;
    }

    // Single-line ignore
    const commentOnly =
      trimmed.startsWith("#") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*");

    ranges.push({
      start: commentOnly ? lineNo + 1 : lineNo,
      end: commentOnly ? lineNo + 1 : lineNo,
      definedAt: {
        start: {
          line: lineNo - 1,
          character: directiveIndex,
        },
        end: {
          line: lineNo - 1,
          character: directiveIndex + "promptshield-ignore".length,
        },
      },
    });
  }

  ranges.sort((a, b) => a.start - b.start);

  return { ignoreFile, ranges };
};

/**
 * Applies inline ignore directives to a list of detected threats.
 *
 * Responsibilities:
 * - Filters threats covered by ignore ranges.
 * - Tracks ignored threats separately.
 * - Tracks unused ignore directives.
 * - Aggregates ignored threats by severity.
 *
 * Complexity:
 * - O(n log n) due to threat sorting
 * - O(n + m) filtering via two-pointer traversal
 *
 * @param text - Raw document text.
 * @param threats - Threats detected by core scan.
 * @param options - Optional filtering flags.
 */
export const filterThreats = (
  text: string,
  threats: ThreatReport[],
  options?: { noInlineIgnore?: boolean },
): FilteredThreatsResult => {
  const ignoredBySeverity: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  // Inline ignores disabled
  if (options?.noInlineIgnore) {
    return {
      threats,
      ignoredThreats: [],
      unusedIgnores: [],
      ignoredBySeverity,
    };
  }

  const ignore = parseIgnoreDirectives(text);

  // Whole-file ignore
  if (ignore.ignoreFile) {
    threats.forEach((t) => {
      ignoredBySeverity[t.severity]++;
    });

    return {
      threats: [],
      ignoredThreats: threats,
      unusedIgnores: ignore.ranges.map(({ used, ...r }) => r),
      ignoredBySeverity,
    };
  }

  // Fast path
  if (ignore.ranges.length === 0 || threats.length === 0) {
    return {
      threats,
      ignoredThreats: [],
      unusedIgnores: ignore.ranges.map(({ used, ...r }) => r),
      ignoredBySeverity,
    };
  }

  const sortedThreats = threats.toSorted((a, b) => a.loc.index - b.loc.index);

  const ranges = ignore.ranges;

  const filtered: ThreatReport[] = [];
  const ignoredThreats: ThreatReport[] = [];

  let t = 0;
  let r = 0;

  while (t < sortedThreats.length) {
    const threat = sortedThreats[t++];
    const line = threat.loc.line;

    while (r < ranges.length && ranges[r].end < line) {
      r++;
    }

    if (r < ranges.length) {
      const range = ranges[r];

      if (line >= range.start && line <= range.end) {
        range.used = true;
        ignoredThreats.push(threat);
        ignoredBySeverity[threat.severity]++;
        continue;
      }
    }

    filtered.push(threat);
  }

  const unusedIgnores = ranges
    .filter((r) => !r.used)
    .map(({ used, ...r }) => r);

  return {
    threats: filtered,
    ignoredThreats,
    unusedIgnores,
    ignoredBySeverity,
  };
};
