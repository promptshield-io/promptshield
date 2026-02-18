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
  "\u200B": "ZWSP", // Zero Width Space
  "\u200C": "ZWNJ", // Zero Width Non-Joiner
  "\u200D": "ZWJ", // Zero Width Joiner
  "\uFEFF": "BOM", // Byte Order Mark
  "\u3164": "HF", // Hangul Filler
  "\uFFA0": "HHF", // Halfwidth Hangul Filler
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
 * Threshold for detecting excessive invisible padding.
 */
const EXCESSIVE_THRESHOLD = 16;

/**
 * Invisible-character detector.
 *
 * Emits one primary span-level rule using precedence:
 *
 * PSU004 → Unicode tag payload
 * PSU005 → Excessive invisible padding
 * PSU001 → Invisible characters present
 *
 * PSU002 is emitted independently for boundary manipulation.
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

  const resetSpan = () => {
    spanStart = -1;
    spanEnd = -1;
  };

  /**
   * Emits the currently accumulated invisible span as a threat.
   *
   * Span semantics:
   * offendingText = entire invisible sequence
   */
  const flushSpan = () => {
    if (spanStart === -1) return;

    const offendingText = text.slice(spanStart, spanEnd);
    const decodedPayload = decodeUnicodeTags(offendingText);

    const labels = [...offendingText].map((c) => {
      const cp = c.codePointAt(0);
      return CHAR_LABELS[c] || `U+${cp?.toString(16).toUpperCase()}`;
    });

    const loc = getLocForIndex(spanStart, context);

    /**
     * PSU004 — Unicode tag payload
     */
    if (decodedPayload) {
      threats.push({
        ruleId: "PSU004",
        category: ThreatCategory.Invisible,
        severity: "HIGH",
        message:
          "Unicode tag characters encode hidden ASCII content inside invisible text.",
        referenceUrl:
          "https://promptshield.js.org/docs/detectors/invisible-chars#PSU004",
        loc,
        offendingText,
        decodedPayload,
        readableLabel: "[TAG_PAYLOAD]",
        suggestion: "Remove Unicode tag characters containing hidden text.",
      });

      resetSpan();
      return;
    }

    if (options.minSeverity === "HIGH") {
      return;
    }

    /**
     * PSU005 — Excessive invisible padding
     */
    if (offendingText.length >= EXCESSIVE_THRESHOLD) {
      threats.push({
        ruleId: "PSU005",
        category: ThreatCategory.Invisible,
        severity: "MEDIUM",
        message:
          "Excessive invisible characters detected. Large invisible sequences are commonly used for padding or obfuscation.",
        referenceUrl:
          "https://promptshield.js.org/docs/detectors/invisible-chars#PSU005",
        loc,
        offendingText,
        readableLabel: `[${labels.join(" ")}]`,
        suggestion: "Remove unnecessary invisible characters.",
      });

      resetSpan();
      return;
    }

    if (options.minSeverity === "MEDIUM") {
      return;
    }
    /**
     * PSU001 — Invisible characters present
     */
    threats.push({
      ruleId: "PSU001",
      category: ThreatCategory.Invisible,
      severity: "LOW",
      message:
        "Invisible Unicode characters detected. These characters can alter tokenization and prompt interpretation without being visible.",
      referenceUrl:
        "https://promptshield.js.org/docs/detectors/invisible-chars#PSU001",
      loc,
      offendingText,
      readableLabel: `[${labels.join(" ")}]`,
      suggestion:
        "Remove invisible characters to ensure the prompt text is interpreted exactly as written.",
    });

    resetSpan();
  };

  while (match !== null) {
    const index = match.index;
    const char = match[0];

    /**
     * PSU002 — Token boundary manipulation
     */
    if (index > 0 && index < text.length - 1) {
      const prev = text[index - 1];
      const next = text[index + char.length];

      if (prev?.trim() && next?.trim()) {
        threats.push({
          ruleId: "PSU002",
          category: ThreatCategory.Invisible,
          severity: "HIGH",
          message:
            "Invisible character detected inside a visible token. This can manipulate token boundaries or bypass validation.",
          referenceUrl:
            "https://promptshield.js.org/docs/detectors/invisible-chars#PSU002",
          loc: getLocForIndex(index, context),
          offendingText: char,
          readableLabel: `[${CHAR_LABELS[char]}]` || "[INVISIBLE]",
          suggestion: "Remove invisible characters embedded within words.",
        });

        if (options.stopOnFirstThreat) return threats;
      }
    }

    if (spanStart === -1) {
      spanStart = index;
      spanEnd = index + char.length;
    } else if (index === spanEnd) {
      spanEnd += char.length;
    } else {
      flushSpan();
      if (options.stopOnFirstThreat && threats.length) return threats;
      spanStart = index;
      spanEnd = index + char.length;
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
 * This decoder performs a best-effort extraction.
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
