import {
  type ScanContext,
  type ScanOptions,
  ThreatCategory,
  type ThreatReport,
} from "./types";
import { getLineOffsets, getLocForIndex } from "./utils";

/**
 * BIDI control characters used in Trojan Source attacks.
 *
 * Reference:
 * CVE-2021-42574
 * https://trojansource.codes/
 *
 * PUSH characters introduce directional context.
 * POP characters terminate that context.
 */
const BIDI_CHARS: Record<string, "PUSH" | "POP"> = {
  "\u202A": "PUSH", // LRE
  "\u202B": "PUSH", // RLE
  "\u202D": "PUSH", // LRO
  "\u202E": "PUSH", // RLO
  "\u2066": "PUSH", // LRI
  "\u2067": "PUSH", // RLI
  "\u2068": "PUSH", // FSI
  "\u202C": "POP", // PDF
  "\u2069": "POP", // PDI
};

/**
 * Trojan Source detector.
 *
 * Detects unsafe usage of Unicode Bidirectional (BIDI) control characters
 * that may cause visual ordering to differ from logical ordering.
 *
 * Detection model:
 *  - Tracks BIDI PUSH → POP spans per line
 *  - Emits ONE threat per detected sequence
 *  - Reports CRITICAL when a sequence is unterminated
 *  - Ignores unmatched POP characters (low-signal)
 *
 * Span semantics:
 *  - offendingText = PUSH + hidden region (+ optional POP)
 *  - decodedPayload = hidden region only
 *
 * Line-scoped detection is intentional — Trojan Source attacks typically
 * rely on visual deception within a single line of code or prompt content.
 */
export const scanTrojanSource = (
  text: string,
  options: ScanOptions = {},
  context: ScanContext = {},
): ThreatReport[] => {
  const threats: ThreatReport[] = [];
  context.lineOffsets = context.lineOffsets ?? getLineOffsets(text);

  const lines = text.split("\n");
  let globalIndex = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    let pushIndex: number | null = null;

    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];
      const type = BIDI_CHARS[char];

      if (type === "PUSH" && pushIndex === null) {
        pushIndex = globalIndex;
      } else if (type === "POP" && pushIndex !== null) {
        const endIndex = globalIndex + 1;

        const offendingText = text.slice(pushIndex, endIndex);
        const decodedPayload = text.slice(pushIndex + 1, globalIndex);

        threats.push({
          category: ThreatCategory.Trojan,
          severity: "CRITICAL",
          message: "Detected Trojan Source BIDI override sequence.",
          loc: getLocForIndex(pushIndex, context),
          offendingText,
          decodedPayload,
          readableLabel: "[BIDI_OVERRIDE]",
          suggestion:
            "Remove bidirectional control characters from the source.",
        });

        pushIndex = null;

        if (options.stopOnFirstThreat) return threats;
      }

      globalIndex++;
    }

    /**
     * CRITICAL RULE:
     * Any BIDI context left open at end of line is suspicious.
     */
    if (pushIndex !== null) {
      const lineEndIndex = globalIndex;

      const offendingText = text.slice(pushIndex, lineEndIndex);
      const decodedPayload = text.slice(pushIndex + 1, lineEndIndex);

      threats.push({
        category: ThreatCategory.Trojan,
        severity: "CRITICAL",
        message:
          "Detected Trojan Source risk: unterminated BIDI control sequence.",
        loc: getLocForIndex(pushIndex, context),
        offendingText,
        decodedPayload,
        readableLabel: "[BIDI_UNTERMINATED]",
        suggestion:
          "Remove BIDI control characters or ensure they are properly terminated within the same line.",
      });

      if (options.stopOnFirstThreat) return threats;
    }

    // account for newline
    globalIndex++;
  }

  return threats;
};
