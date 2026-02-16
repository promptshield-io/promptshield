import {
  type ScanContext,
  type ScanOptions,
  ThreatCategory,
  type ThreatReport,
} from "./types";
import { getLineOffsets, getLocForIndex } from "./utils";

/**
 * Unicode script detectors.
 *
 * These are intentionally scoped to scripts most commonly used
 * in homoglyph spoofing attacks involving Latin text.
 */
const LATIN = /\p{Script=Latin}/u;
const CYRILLIC = /\p{Script=Cyrillic}/u;
const GREEK = /\p{Script=Greek}/u;

/**
 * Regex to find candidate "words".
 *
 * A word is defined as a contiguous sequence of:
 * - letters
 * - numbers
 * - underscores
 *
 * Using Unicode property escapes ensures support for international text.
 */
const WORD_REGEX = /[\p{L}\p{N}_]+/gu;

/**
 * Homoglyph detector.
 *
 * Detects visually deceptive words that mix characters from different
 * Unicode scripts — a common technique used in spoofing attacks.
 *
 * Example:
 *
 *   "pаypal"  (Cyrillic "а" inside Latin word)
 *   "admіn"   (Cyrillic "і")
 *
 * These words appear normal to humans but differ at the code-point level.
 *
 * Detection model:
 * - Scan text for "word spans"
 * - Check script composition per word
 * - Emit ONE threat per suspicious word
 *
 * Span semantics:
 *   offendingText = entire word
 *
 * Requires Unicode property escape support (Node 18+).
 *
 * @param text Raw text to scan
 * @param options Scanner configuration
 * @param context Location context
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

    /**
     * Flag Latin mixed with Cyrillic or Greek.
     *
     * This intentionally avoids flagging all mixed-script cases to
     * reduce false positives in multilingual content.
     */
    if (hasLatin && (hasCyrillic || hasGreek)) {
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
          "Replace with standard characters. This may indicate a spoofing attempt.",
      });

      if (options?.stopOnFirstThreat) return threats;
    }

    match = regex.exec(text);
  }

  return threats;
};
