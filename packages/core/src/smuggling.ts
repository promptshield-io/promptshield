/** biome-ignore-all lint/suspicious/noAssignInExpressions: iterating over regex matches */
import {
  type ScanContext,
  type ScanOptions,
  ThreatCategory,
  type ThreatReport,
} from "./types";
import { getLineOffsets, getLocForIndex } from "./utils";

/**
 * Regex for Base64-like payloads.
 */
const BASE64_REGEX =
  /(?:[A-Za-z0-9+/]{4}){8,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;

/** Detect hidden Markdown comments */
const MARKDOWN_COMMENT_REGEX = /<!--[\s\S]*?-->/g;

/** Detect empty Markdown links */
const EMPTY_LINK_REGEX = /\[\s*\]\([^)]+\)/g;

/** Detect invisible-character runs for steganography - Detect runs of invisible characters that may encode hidden binary data*/
const STEG_REGEX = /([\u200B-\u200D\u2060\uFEFF\u3164\uFFA0]+)/g;

/**
 * Attempts Base64 decoding and checks printable ASCII ratio.
 * Helps reduce false positives from hashes or random tokens.
 */
const decodeBase64IfLikely = (value: string): string | null => {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    if (!decoded) return null;

    let printable = 0;
    for (const c of decoded) {
      const code = c.charCodeAt(0);
      if (code >= 32 && code <= 126) printable++;
    }

    const ratio = printable / decoded.length;
    return ratio >= 0.7 ? decoded : null;
  } catch {
    return null;
  }
};

/**
 * Smuggling detector.
 *
 * Detects techniques used to conceal instructions or data inside text:
 * - Base64 payloads
 * - Hidden Markdown comments
 * - Invisible Markdown links
 * - Invisible-character steganography
 *
 * Context is intentionally mutable so detectors can share `lineOffsets`.
 */
export const scanSmuggling = (
  text: string,
  options: ScanOptions = {},
  context: ScanContext = {},
): ThreatReport[] => {
  if (options.minSeverity === "CRITICAL") return [];

  const threats: ThreatReport[] = [];
  let match: RegExpExecArray | null;

  context.lineOffsets = context.lineOffsets ?? getLineOffsets(text);

  /**
   * 1. Invisible-character steganography (HIGH)
   */
  const stegRegex = new RegExp(STEG_REGEX);

  while ((match = stegRegex.exec(text)) !== null) {
    const captured = match[0];

    if (captured.length < 8) continue;
    if (captured.length > 4096) continue; // safety cap

    const distinctChars = Array.from(new Set(captured.split("")));
    if (distinctChars.length !== 2) continue;

    const [bit0, bit1] = distinctChars;

    const permutations = [
      { zero: bit0, one: bit1 },
      { zero: bit1, one: bit0 },
    ];

    for (const { zero, one } of permutations) {
      let binary = "";

      for (const char of captured) {
        if (char === zero) binary += "0";
        else if (char === one) binary += "1";
      }

      let decoded = "";

      for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.slice(i, i + 8);
        if (byte.length !== 8) continue;

        const code = parseInt(byte, 2);
        if (code >= 32 && code <= 126) {
          decoded += String.fromCharCode(code);
        }
      }

      if (decoded.length >= 3) {
        threats.push({
          category: ThreatCategory.Smuggling,
          severity: "HIGH",
          message: `Detected hidden steganography message: "${decoded}"`,
          loc: getLocForIndex(match.index, context),
          offendingText: captured,
          readableLabel: `[Hidden: "${decoded}"]`,
          suggestion:
            "Invisible-character encoding detected. Inspect hidden content.",
        });

        if (options.stopOnFirstThreat) return threats;
        break;
      }
    }
  }

  if (options.minSeverity === "HIGH") return threats;

  /**
   * 2. Base64 payload detection (MEDIUM)
   */
  const b64Regex = new RegExp(BASE64_REGEX);

  while ((match = b64Regex.exec(text)) !== null) {
    const candidate = match[0];
    if (candidate.length <= 50) continue;

    const decoded = decodeBase64IfLikely(candidate);
    if (!decoded) continue;

    const index = match.index;

    threats.push({
      category: ThreatCategory.Smuggling,
      severity: "MEDIUM",
      message: `Detected Base64 payload containing readable text`,
      loc: getLocForIndex(index, context),
      offendingText: candidate,
      readableLabel: `[Base64]: ${decoded.slice(0, 50)}...`,
      suggestion: "Decoded Base64 contains readable text. Inspect payload.",
    });

    if (options.stopOnFirstThreat) return threats;
  }

  if (options.minSeverity === "MEDIUM") return threats;

  /**
   * 3. Hidden Markdown comments (LOW)
   */
  const commentRegex = new RegExp(MARKDOWN_COMMENT_REGEX);

  while ((match = commentRegex.exec(text)) !== null) {
    threats.push({
      category: ThreatCategory.Smuggling,
      severity: "LOW",
      message: "Detected Markdown comment",
      loc: getLocForIndex(match.index, context),
      offendingText: match[0],
      readableLabel: "[Hidden Comment]",
      suggestion:
        "Comments are not visible in rendered Markdown but can carry instructions.",
    });

    if (options.stopOnFirstThreat) {
      return threats;
    }
  }

  /**
   * 4. Empty Markdown links (LOW)
   */
  const linkRegex = new RegExp(EMPTY_LINK_REGEX);

  while ((match = linkRegex.exec(text)) !== null) {
    threats.push({
      category: ThreatCategory.Smuggling,
      severity: "LOW",
      message: "Detected empty link (invisible in rendered Markdown)",
      loc: getLocForIndex(match.index, context),
      offendingText: match[0],
      readableLabel: "[Empty Link]",
      suggestion: "Empty links can be used to hide URLs or data.",
    });

    if (options.stopOnFirstThreat) {
      return threats;
    }
  }

  return threats;
};
