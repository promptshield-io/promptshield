import {
  type ScanContext,
  type ScanOptions,
  ThreatCategory,
  type ThreatReport,
} from "./types";
import { getLineOffsets, getLocForIndex } from "./utils";

// Scripts of interest
const LATIN = /\p{Script=Latin}/u;
const CYRILLIC = /\p{Script=Cyrillic}/u;
const GREEK = /\p{Script=Greek}/u;

/**
 * Regex to find "words" (contiguous sequences of letters, numbers, or underscores).
 * Uses Unicode property escapes for letters and numbers.
 */
const WORD_REGEX = /[\p{L}\p{N}_]+/gu;

/**
 * Scans a string for homoglyphs (mixed-script words).
 * Specifically targets words mixing Latin with Cyrillic or Greek characters.
 *
 * Requires Unicode property escape support (Node 18+)
 *
 * @param text - The text to scan.
 * @param options Scanner configuration
 * @param context Optional scanning context for location tracking
 * @returns An array of detected threats.
 */
export const scanHomoglyphs = (
  text: string,
  options: ScanOptions = {},
  context: ScanContext = {},
): ThreatReport[] => {
  // Clone regex to avoid shared lastIndex mutation during concurrent scans
  const regex = new RegExp(WORD_REGEX);
  let match: RegExpExecArray | null = regex.exec(text);

  if (!match) return [];

  const threats: ThreatReport[] = [];
  context.lineOffsets = context.lineOffsets ?? getLineOffsets(text);

  while (match !== null) {
    const word = match[0];
    const index = match.index;

    const hasLatin = LATIN.test(word);
    const hasCyrillic = CYRILLIC.test(word);
    const hasGreek = GREEK.test(word);

    // We strictly flag Latin + (Cyrillic/Greek) as these are most common for spoofing
    if (hasLatin && (hasCyrillic || hasGreek)) {
      // Construct a readable label showing which scripts are mixed
      const scripts: string[] = [];
      if (hasLatin) scripts.push("Latin");
      if (hasCyrillic) scripts.push("Cyrillic");
      if (hasGreek) scripts.push("Greek");

      threats.push({
        category: ThreatCategory.Homoglyph,
        severity: "CRITICAL",
        message: `Detected mixed-script homoglyph: ${word} (${scripts.join(
          " + ",
        )})`,
        loc: getLocForIndex(index, context),
        offendingText: word,
        readableLabel: `[Mixed-Script] ${word}`,
        suggestion:
          "Replace with standard characters. This may be a spoofing attempt.",
      });

      // CRITICAL threats always bypass severity filtering.
      if (options?.stopOnFirstThreat) return threats;
    }
    match = regex.exec(text);
  }

  return threats;
};
