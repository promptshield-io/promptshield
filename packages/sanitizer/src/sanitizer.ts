/**
 * PromptShield Sanitizer
 *
 * Deterministic, idempotent text sanitization for prompt hygiene
 * and CLI rewriting workflows.
 *
 * This module performs only "safe removals" by default and does not
 * depend on detection logic from @promptshield/core.
 *
 * Guarantees:
 * - deterministic output
 * - idempotent transformations
 * - no semantic Unicode folding (default mode)
 * - engine-safe Unicode handling
 *
 * Intended uses:
 * - CLI sanitize --write
 * - prompt preprocessing
 * - markdown cleanup
 * - LLM input hygiene
 */

/* -------------------------------------------------------------------------- */
/* Regex definitions                                                          */
/* -------------------------------------------------------------------------- */

/** Byte Order Mark (BOM) */
const BOM_REGEX = /\uFEFF/g;

/**
 * Invisible / obfuscation characters used in prompt injection.
 *
 * Includes:
 * - Zero-width characters (ZWSP, ZWNJ, ZWJ)
 * - WORD JOINER
 * - SOFT HYPHEN
 * - Hangul fillers
 * - Unicode tag characters
 */
const INVISIBLE_REGEX =
  /([\u200B-\u200D\u2060\u00AD\u3164\uFFA0]|[\u{E0000}-\u{E007F}])/gu;

/** Variation selectors (handled separately for engine stability) */
const VARIATION_SELECTOR_REGEX = /[\uFE00-\uFE0F]/g;

/** Markdown / HTML comments used for smuggling */
const MARKDOWN_COMMENT_REGEX = /<!--[\s\S]*?-->/g;

/** Empty markdown links used for payload hiding */
const EMPTY_LINK_REGEX = /\[\]\([^)]*\)/g;

/**
 * Compatibility characters safe for NFKC normalization.
 *
 * Includes:
 * - Unicode space variants
 * - NBSP
 * - Ideographic space
 * - Fullwidth ASCII
 */
const COMPATIBILITY_NORMALIZE_REGEX =
  /[\u00A0\u2000-\u200A\u202F\u205F\u3000\uFF01-\uFF5E]/g;

/** Normalize CRLF/CR to LF */
const NEWLINE_REGEX = /\r\n?/g;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const normalizeSegment = (segment: string): string => segment.normalize("NFKC");

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Applies safe, formatter-style sanitization.
 *
 * Transformation order is intentional:
 * 1. Normalize line endings
 * 2. Remove BOM
 * 3. Remove invisible characters
 * 4. Remove variation selectors
 * 5. Remove markdown comments
 * 6. Remove empty links
 * 7. Normalize compatibility characters
 *
 * This function is deterministic and idempotent.
 */
export const sanitize = (text: string): string =>
  text
    .replace(NEWLINE_REGEX, "\n")
    .replace(BOM_REGEX, "")
    .replace(INVISIBLE_REGEX, "")
    .replace(VARIATION_SELECTOR_REGEX, "")
    .replace(MARKDOWN_COMMENT_REGEX, "")
    .replace(EMPTY_LINK_REGEX, "")
    .replace(COMPATIBILITY_NORMALIZE_REGEX, normalizeSegment);

/**
 * Strict sanitization mode.
 *
 * Applies full Unicode NFKC normalization after safe sanitization.
 * This may alter semantic characters and typography.
 */
export const sanitizeStrict = (text: string): string =>
  sanitize(text).normalize("NFKC");

export * from "./fix";
