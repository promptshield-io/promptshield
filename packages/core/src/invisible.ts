import {
  type ScanContext,
  type ScanOptions,
  ThreatCategory,
  type ThreatReport,
} from "./types";
import { getLineOffsets, getLocForIndex } from "./utils";

/**
 * Registry of invisible characters with readable labels.
 *
 * These characters are typically not rendered visibly in editors or UI,
 * which makes them useful for content smuggling, token-boundary manipulation,
 * and prompt obfuscation.
 *
 * BIDI control characters are intentionally excluded here and handled by
 * the Trojan Source detector.
 */
const CHAR_LABELS: Readonly<Record<string, string>> = {
  "\u200B": "[ZWSP]", // Zero Width Space
  "\u200C": "[ZWNJ]", // Zero Width Non-Joiner
  "\u200D": "[ZWJ]", // Zero Width Joiner
  "\uFEFF": "[BOM]", // Byte Order Mark
  "\u3164": "[HF]", // Hangul Filler
  "\uFFA0": "[HHF]", // Halfwidth Hangul Filler
};

/**
 * Invisible-character detection regex.
 *
 * Detects:
 *  - Zero-width characters
 *  - BOM
 *  - Hangul fillers
 *  - Unicode tag characters (U+E0000 block)
 *
 * Unicode tag characters are included because they can be used to encode
 * hidden ASCII-like data inside text streams.
 */
const INVISIBLE_REGEX =
  /([\u200B-\u200D\uFEFF\u3164\uFFA0]|\uDB40[\uDC00-\uDC7F])/gu;

/**
 * Scans text for invisible characters that may alter how content is
 * interpreted by LLMs, parsers, or tokenizers.
 *
 * Design notes:
 * - BIDI detection is handled separately by the Trojan Source detector.
 * - All findings are reported as HIGH severity.
 * - The detector exits early when `minSeverity === "CRITICAL"`.
 *
 * @param text Raw input text to scan
 * @param options Scanner configuration
 * @param context Optional scanning context for location tracking
 * @returns Array of detected invisible character threats
 */
export const scanInvisibleChars = (
  text: string,
  options: ScanOptions = {},
  context: ScanContext = {},
): ThreatReport[] => {
  // Clone regex instance to avoid shared lastIndex mutation
  const invisibleRegex = new RegExp(INVISIBLE_REGEX);

  let match: RegExpExecArray | null = invisibleRegex.exec(text);
  if (!match || options?.minSeverity === "CRITICAL") return [];

  const threats: ThreatReport[] = [];
  context.lineOffsets = context.lineOffsets ?? getLineOffsets(text);

  while (match !== null) {
    const index = match.index;
    const char = match[0];

    const cp = char.codePointAt(0);
    const label = CHAR_LABELS[char] || `[U+${cp?.toString(16).toUpperCase()}]`;

    threats.push({
      category: ThreatCategory.Invisible,
      severity: "HIGH",
      message: `Detected invisible character: ${label}`,
      loc: getLocForIndex(index, context),
      offendingText: char,
      readableLabel: label,
      suggestion:
        "Remove this character to ensure what you see is what the AI model receives.",
    });

    if (options?.stopOnFirstThreat) return threats;
    match = invisibleRegex.exec(text);
  }

  return threats;
};
