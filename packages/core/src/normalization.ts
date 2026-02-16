import {
  type ScanContext,
  type ScanOptions,
  ThreatCategory,
  type ThreatReport,
} from "./types";
import { getLineOffsets, getLocForIndex } from "./utils";

/**
 * Unicode normalization detector.
 *
 * Detects characters that change under NFKC normalization.
 *
 * Unicode normalization can transform visually similar characters
 * into canonical equivalents. When user-visible text differs from
 * its normalized form, this may indicate:
 *
 * - spoofing attempts
 * - homoglyph confusion
 * - prompt-smuggling techniques
 * - content-validation bypass
 *
 * Detection model:
 * - Compare each character against its NFKC-normalized form
 * - Group adjacent normalization-sensitive characters into a span
 * - Emit one threat per span
 *
 * NOTE:
 * This is intentionally heuristic. Many normalization changes are
 * legitimate in multilingual text, but normalization-sensitive spans
 * in prompts or code should be surfaced for inspection.
 *
 * Span semantics:
 *   offendingText = original span
 *   decodedPayload = normalized span
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
  let spanStart = -1;
  let spanEnd = -1;
  let normalizedSpan = "";

  const flushSpan = () => {
    if (spanStart === -1) return;

    const offendingText = text.slice(spanStart, spanEnd);

    threats.push({
      category: ThreatCategory.Normalization,
      severity: "HIGH",
      message: `Detected normalization-sensitive text: '${offendingText}' → '${normalizedSpan}'`,
      loc: getLocForIndex(spanStart, context),
      offendingText,
      decodedPayload: normalizedSpan,
      readableLabel: "[NFKC_DIFF]",
      suggestion: "Replace with normalized text to avoid ambiguity.",
    });

    spanStart = -1;
    spanEnd = -1;
    normalizedSpan = "";
  };

  for (const char of text) {
    const normChar = char.normalize("NFKC");

    if (char !== normChar) {
      if (spanStart === -1) {
        spanStart = index;
        spanEnd = index + char.length;
      } else {
        spanEnd += char.length;
      }

      normalizedSpan += normChar;

      if (options.stopOnFirstThreat) {
        flushSpan();
        return threats;
      }
    } else {
      flushSpan();
    }

    index += char.length;
  }

  flushSpan();

  return threats;
};
