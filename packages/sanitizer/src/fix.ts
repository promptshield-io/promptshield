import { ThreatCategory, type ThreatReport } from "@promptshield/core";

export interface FixResult {
  text: string;
  fixed: ThreatReport[];
  skipped: ThreatReport[];
}

/**
 * Applies safe automatic fixes for detected threats.
 *
 * Design goals:
 * - deterministic
 * - idempotent
 * - index-safe (process from end → start)
 * - only applies "safe removals"
 *
 * Unsafe or semantic transformations must be handled
 * explicitly by higher-level tooling.
 */
export const applyFixes = (
  text: string,
  threats: ThreatReport[],
): FixResult => {
  if (!threats.length) return { text, fixed: [], skipped: [] };

  // Sort descending to avoid index shifting
  const sorted = [...threats].sort((a, b) => b.loc.index - a.loc.index);
  const fixed: ThreatReport[] = [];
  const skipped: ThreatReport[] = [];

  let output = text;

  for (const threat of sorted) {
    const { index } = threat.loc;
    const offending = threat.offendingText;

    if (index < 0 || !offending) continue;

    switch (threat.category) {
      case ThreatCategory.Invisible:
      case ThreatCategory.Trojan:
        output =
          output.slice(0, index) + output.slice(index + offending.length);
        fixed.push(threat);
        break;

      case ThreatCategory.Smuggling:
        if (
          threat.readableLabel === "[Hidden Comment]" ||
          threat.readableLabel === "[Empty Link]"
        ) {
          output =
            output.slice(0, index) + output.slice(index + offending.length);
          fixed.push(threat);
        } else {
          skipped.push(threat);
        }
        break;

      case ThreatCategory.Normalization:
        output =
          output.slice(0, index) +
          offending.normalize("NFKC") +
          output.slice(index + offending.length);
        fixed.push(threat);
        break;

      default:
        skipped.push(threat);
        break;
    }
  }

  return { text: output, fixed, skipped };
};
