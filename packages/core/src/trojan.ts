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
 *  - Tracks BIDI PUSH/POP stack per line
 *  - Reports CRITICAL when a line ends with an unterminated BIDI context
 *  - Ignores unmatched POP characters (low-signal)
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
    const stack: { char: string; index: number }[] = [];

    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];
      const type = BIDI_CHARS[char];

      if (type === "PUSH") {
        stack.push({ char, index: globalIndex });
      } else if (type === "POP") {
        if (stack.length > 0) stack.pop();
      }

      globalIndex++;
    }

    // account for newline
    globalIndex++;

    /**
     * CRITICAL RULE:
     * Any BIDI context left open at end of line is suspicious.
     */
    if (stack.length > 0) {
      const firstUnclosed = stack[0];

      threats.push({
        category: ThreatCategory.Trojan,
        severity: "CRITICAL",
        message:
          "Detected Trojan Source risk: unterminated BIDI control sequence.",
        loc: getLocForIndex(firstUnclosed.index, context),
        offendingText: firstUnclosed.char,
        readableLabel: `[U+${firstUnclosed.char
          .codePointAt(0)
          ?.toString(16)
          .toUpperCase()}]`,
        suggestion:
          "Remove BIDI control characters or ensure they are properly terminated within the same line.",
      });

      if (options.stopOnFirstThreat) return threats;
    }
  }

  return threats;
};
