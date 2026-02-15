import {
  type ScanContext,
  type ScanOptions,
  ThreatCategory,
  type ThreatReport,
} from "./types";
import { getLineOffsets, getLocForIndex } from "./utils";

/**
 * Scans for Unicode normalization-sensitive characters.
 *
 * Detects characters that change under NFKC normalization, which can
 * introduce ambiguity between visually similar text representations.
 *
 * This detector intentionally uses a heuristic approach — not all NFKC
 * changes are malicious, but normalization differences in prompts or
 * code can indicate spoofing or content-smuggling attempts.
 */
export const scanNormalization = (
  text: string,
  options: ScanOptions = {},
  context: ScanContext = {},
): ThreatReport[] => {
  const threats: ThreatReport[] = [];

  const normalized = text.normalize("NFKC");
  if (text === normalized) return [];

  context.lineOffsets = context.lineOffsets ?? getLineOffsets(text);

  let index = 0;

  for (const char of text) {
    const normChar = char.normalize("NFKC");

    if (char !== normChar) {
      threats.push({
        category: ThreatCategory.Normalization,
        severity: "HIGH",
        message: `Detected normalization-sensitive character: '${char}' normalizes to '${normChar}'`,
        loc: getLocForIndex(index, context),
        offendingText: char,
        readableLabel: `[U+${char.codePointAt(0)?.toString(16).toUpperCase()}]`,
        suggestion: "Replace with the normalized character to avoid ambiguity.",
      });

      if (options.stopOnFirstThreat) return threats;
    }

    index += char.length;
  }

  return threats;
};
