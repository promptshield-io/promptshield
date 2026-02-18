import type { Severity, ThreatReport } from "@promptshield/core";

interface IgnoreRange {
  start: number;
  end: number;
  definedAt: number;
  used?: boolean;
}

interface IgnoreParseResult {
  ignoreFile: boolean;
  ranges: IgnoreRange[];
}

export interface FilterThreatsResult {
  threats: ThreatReport[];
  ignoredThreats: ThreatReport[];
  unusedIgnores: Omit<IgnoreRange, "used">[];
  ignoredBySeverity: Record<Severity, number>;
}

/**
 * INTERNAL
 * Parses promptshield-ignore directives from text.
 *
 * Supported directives:
 * - promptshield-ignore all     (must appear near top of file)
 * - promptshield-ignore next N
 * - promptshield-ignore         (line or next-line)
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
        definedAt: lineNo,
      });

      continue;
    }

    const commentOnly =
      line.startsWith("#") || line.startsWith("//") || line.startsWith("/*");

    ranges.push({
      start: commentOnly ? lineNo + 1 : lineNo,
      end: commentOnly ? lineNo + 1 : lineNo,
      definedAt: lineNo,
    });
  }

  ranges.sort((a, b) => a.start - b.start);
  return { ignoreFile, ranges };
};

/**
 * Filters threats using PromptShield ignore directives.
 *
 * Additionally tracks ignored threats for reporting.
 */
export const filterThreats = (
  text: string,
  threats: ThreatReport[],
): FilterThreatsResult => {
  const ignore = parseIgnoreDirectives(text);

  const ignoredBySeverity: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

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

  if (ignore.ranges.length === 0 || threats.length === 0) {
    return {
      threats,
      ignoredThreats: [],
      unusedIgnores: ignore.ranges.map(({ used, ...r }) => r),
      ignoredBySeverity,
    };
  }

  const sortedThreats = [...threats].sort((a, b) => a.loc.line - b.loc.line);
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
