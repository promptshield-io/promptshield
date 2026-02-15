import type { ThreatReport } from "@promptshield/core";

interface IgnoreRange {
  start: number;
  end: number;
  used?: boolean;
}

interface IgnoreParseResult {
  ignoreFile: boolean;
  ranges: IgnoreRange[];
}

/**
 * INTERNAL — parses ignore directives from text.
 */
const parseIgnoreDirectives = (text: string): IgnoreParseResult => {
  const lines = text.split("\n");

  const ranges: IgnoreRange[] = [];
  let ignoreFile = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const lineNo = i + 1;

    if (!line.includes("promptshield-ignore")) continue;

    if (line.includes("promptshield-ignore all") && lineNo <= 10) {
      ignoreFile = true;
      continue;
    }

    const nextMatch = line.match(/promptshield-ignore\s+next\s*(\d+)?/);
    if (nextMatch) {
      const count = Math.max(nextMatch[1] ? parseInt(nextMatch[1], 10) : 1, 1);
      ranges.push({
        start: lineNo + 1,
        end: lineNo + count,
      });
      continue;
    }

    const commentOnly =
      line.startsWith("#") || line.startsWith("//") || line.startsWith("/*");

    if (commentOnly) {
      ranges.push({
        start: lineNo + 1,
        end: lineNo + 1,
      });
    } else {
      ranges.push({
        start: lineNo,
        end: lineNo,
      });
    }
  }

  ranges.sort((a, b) => a.start - b.start);
  return { ignoreFile, ranges };
};

/**
 * Filters threats using PromptShield ignore directives.
 *
 * Returns:
 * - filtered threats
 * - unused ignore ranges (for IDE warnings)
 */
export const filterThreats = (
  text: string,
  threats: ThreatReport[],
): {
  threats: ThreatReport[];
  unusedIgnores: { start: number; end: number }[];
} => {
  const ignore = parseIgnoreDirectives(text);

  if (ignore.ignoreFile) {
    return {
      threats: [],
      unusedIgnores: ignore.ranges.map((r) => ({
        start: r.start,
        end: r.end,
      })),
    };
  }

  if (ignore.ranges.length === 0 || threats.length === 0) {
    return {
      threats,
      unusedIgnores: ignore.ranges.map((r) => ({
        start: r.start,
        end: r.end,
      })),
    };
  }

  // Step 1: sort threats by line
  const sortedThreats = [...threats].sort((a, b) => a.loc.line - b.loc.line);

  const ranges = ignore.ranges;

  const filtered: ThreatReport[] = [];

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
        continue;
      }
    }

    filtered.push(threat);
  }

  const unusedIgnores = ranges
    .filter((r) => !r.used)
    .map((r) => ({
      start: r.start,
      end: r.end,
    }));

  return {
    threats: filtered,
    unusedIgnores,
  };
};
