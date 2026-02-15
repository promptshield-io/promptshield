import type { ScanContext } from "./types";

/**
 * Computes line start offsets for a string.
 *
 * Each entry represents the character index where a new line begins.
 * The first entry is always `0`.
 *
 * Example:
 * "a\nb\nc" → [0, 2, 4]
 *
 * This enables fast index → (line, column) mapping without repeatedly
 * scanning the entire string.
 */
export const getLineOffsets = (text: string): number[] => {
  const lineOffsets = [0];

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      lineOffsets.push(i + 1);
    }
  }

  return lineOffsets;
};

/**
 * Resolves a character index into a line/column location.
 *
 * Uses binary search over precomputed line offsets for O(log n) lookup.
 *
 * Context provides:
 * - baseLine
 * - baseCol
 * - lineOffsets
 *
 * `baseLine` and `baseCol` allow this function to operate correctly when
 * scanning substrings that originate from a larger document.
 */
export const getLocForIndex = (
  index: number,
  context: ScanContext,
): { line: number; column: number; index: number } => {
  const { lineOffsets = [0], baseLine = 1, baseCol = 1 } = context;

  let low = 0;
  let high = lineOffsets.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;

    if (lineOffsets[mid] <= index) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const lineIndex = Math.max(high, 0);

  return {
    line: baseLine + lineIndex,
    column: index - lineOffsets[lineIndex] + (lineIndex === 0 ? baseCol : 1),
    index,
  };
};
