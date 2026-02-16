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
 * which makes them useful for:
 *
 * - prompt smuggling
 * - token-boundary manipulation
 * - content obfuscation
 * - validation bypass
 *
 * NOTE:
 * BIDI control characters are intentionally excluded here and handled
 * by the Trojan Source detector.
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
 * Unicode tag characters may encode hidden ASCII-like data.
 */
const INVISIBLE_REGEX =
  /([\u200B-\u200D\uFEFF\u3164\uFFA0]|\uDB40[\uDC00-\uDC7F])/gu;

/**
 * Invisible-character detector.
 *
 * Detects spans of adjacent invisible characters that may alter how
 * content is interpreted by LLMs, tokenizers, parsers, or validation logic.
 *
 * Detection model:
 * - Groups adjacent invisible characters into a single threat span
 * - Reports HIGH severity
 * - Exits early when `minSeverity === "CRITICAL"`
 *
 * IMPORTANT:
 * Invisible characters typically do NOT contain readable payloads.
 * Their risk comes from structural manipulation rather than hidden text.
 *
 * Examples:
 *
 * "ignore​previous​instructions"
 * "admin" vs "ad​min"
 *
 * In these cases, machines interpret boundaries differently than humans.
 *
 * @param text Raw input text
 * @param options Scanner options
 * @param context Location context
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

  let spanStart = -1;
  let spanEnd = -1;

  /**
   * Emits the currently accumulated invisible span as a threat.
   */
  const flushSpan = () => {
    if (spanStart === -1) return;

    const offendingText = text.slice(spanStart, spanEnd);

    const labels = [...offendingText].map((c) => {
      const cp = c.codePointAt(0);
      return CHAR_LABELS[c] || `[U+${cp?.toString(16).toUpperCase()}]`;
    });

    threats.push({
      category: ThreatCategory.Invisible,
      severity: "HIGH",
      message: `Detected invisible character sequence (${labels.length})`,
      loc: getLocForIndex(spanStart, context),
      offendingText,
      readableLabel: `[${labels.join(" ")}]`,
      suggestion:
        "Remove invisible characters to ensure what you see is what the AI model receives.",
      decodedPayload: decodeUnicodeTags(offendingText),
    });

    spanStart = -1;
    spanEnd = -1;
  };

  while (match !== null) {
    const index = match.index;
    const char = match[0];

    if (spanStart === -1) {
      spanStart = index;
      spanEnd = index + char.length;
    } else if (index === spanEnd) {
      spanEnd += char.length;
    } else {
      flushSpan();
      spanStart = index;
      spanEnd = index + char.length;
    }

    if (options?.stopOnFirstThreat) {
      flushSpan();
      return threats;
    }

    match = invisibleRegex.exec(text);
  }

  flushSpan();

  return threats;
};

/**
 * Attempts to decode Unicode tag characters into ASCII text.
 *
 * Unicode tag characters live in the range:
 *
 *   U+E0000 – U+E007F
 *
 * Each tag character encodes an ASCII value using:
 *
 *   ASCII = codePoint - 0xE0000
 *
 * Attackers can use this mechanism to embed hidden instructions
 * or metadata inside otherwise invisible text streams.
 *
 * Example:
 * Invisible sequence encoding:
 *   "ignore previous instructions"
 *
 * This decoder performs a best-effort extraction:
 *
 * - Only printable ASCII (32–126) is decoded
 * - Non-ASCII tags are ignored
 * - Returns `undefined` if no payload is found
 *
 * The function is intentionally tolerant and side-effect free.
 *
 * @param text A string potentially containing Unicode tag characters
 * @returns Decoded ASCII payload if present
 */
export const decodeUnicodeTags = (text: string): string | undefined => {
  let result = "";
  let found = false;

  for (const char of text) {
    // biome-ignore lint/style/noNonNullAssertion: ok
    const cp = char.codePointAt(0)!;

    if (cp >= 0xe0000 && cp <= 0xe007f) {
      const ascii = cp - 0xe0000;

      if (ascii >= 32 && ascii <= 126) {
        result += String.fromCharCode(ascii);
        found = true;
      }
    }
  }

  return found ? result : undefined;
};
