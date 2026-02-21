/**
 * Severity levels assigned to detected threats.
 *
 * These levels are ordered by risk:
 *
 * LOW < MEDIUM < HIGH < CRITICAL
 *
 * The scanner may filter results using `ScanOptions.minSeverity`.
 */
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Categories of threats detected by PromptShield.
 *
 * Categories describe the *type of attack vector* rather than
 * the specific implementation detail.
 */
export enum ThreatCategory {
  /**
   * Invisible Unicode characters such as:
   * - Zero Width Space (ZWSP)
   * - Zero Width Joiner (ZWJ)
   * - BIDI markers
   *
   * These are commonly used for prompt injection smuggling.
   */
  Invisible = "INVISIBLE_CHAR",

  /**
   * Mixed-script characters that visually resemble others.
   *
   * Example:
   * Cyrillic "а" vs Latin "a".
   */
  Homoglyph = "HOMOGLYPH",

  /**
   * Encoded or concealed content intended to bypass inspection.
   *
   * Examples:
   * - Base64 payloads
   * - hidden markdown
   * - encoded instructions
   */
  Smuggling = "SMUGGLING",

  /**
   * Prompt injection patterns.
   *
   * Deterministic, rule-based detection only.
   */
  Injection = "PROMPT_INJECTION",

  /**
   * Trojan Source attack vectors (CVE-2021-42574).
   *
   * These use bidirectional override characters to manipulate
   * code or prompt interpretation.
   */
  Trojan = "TROJAN_SOURCE",

  /**
   * Unicode normalization inconsistencies where visually identical
   * characters differ at the code-point level.
   */
  Normalization = "NORMALIZATION",
}

/**
 * Location of a threat within the scanned text.
 *
 * The scanner reports both human-readable and machine-friendly
 * position data.
 */
export interface ThreatLoc {
  /** 1-based line number */
  line: number;

  /** 1-based column number */
  column: number;

  /** 0-based character index in the scanned text */
  index: number;
}

/**
 * Report describing a detected threat span.
 *
 * NOTE:
 * A ThreatReport represents a **span**, not a single character.
 * Adjacent suspicious characters should be grouped into one report.
 */
export interface ThreatReport {
  /**
   * Stable rule identifier.
   *
   * Example:
   * "PSU001", "PST001", "PSI002"
   */
  ruleId: string;

  /** Threat classification */
  category: ThreatCategory;

  /** Risk severity */
  severity: Severity;

  /**
   * Human-readable diagnostic message.
   *
   * Describes WHAT was detected and WHY it matters.
   * This should not include remediation steps.
   */
  message: string;

  /** Location of the threat start */
  loc: ThreatLoc;

  /**
   * The substring responsible for the detection.
   *
   * This may contain multiple characters if the threat
   * represents a sequence.
   */
  offendingText: string;

  /**
   * Optional readable label for UI rendering.
   *
   * Example:
   * "[ZWSP × 3]"
   */
  readableLabel?: string;

  /**
   * Suggested remediation guidance.
   *
   * This is optional and may vary by environment (editor, CI, UI).
   */
  suggestion?: string;

  /**
   * Optional decoded payload extracted from concealed content.
   *
   * Example:
   * "ignore previous instructions"
   */
  decodedPayload?: string;

  /**
   * Reference documentation explaining the risk.
   *
   * Example:
   * https://promptshield.js.org/docs/detectors/invisible-chars#PSU001
   */
  referenceUrl: string;

  /**
   * Indicates whether this threat was suppressed
   * by an ignore directive.
   */
  suppressed?: boolean;
}

/**
 * Scanner configuration options.
 */
export interface ScanOptions {
  /**
   * Stop scanning after the first detected threat.
   *
   * Useful for CI validation or fast-fail scenarios.
   *
   * @default false
   */
  stopOnFirstThreat?: boolean;

  /**
   * Minimum severity to report.
   *
   * @default "LOW"
   */
  minSeverity?: Severity;

  /** Disable invisible-character detection */
  disableInvisible?: boolean;

  /** Disable homoglyph detection */
  disableHomoglyphs?: boolean;

  /** Disable smuggling detection */
  disableSmuggling?: boolean;

  /** Disable Trojan Source detection */
  disableTrojan?: boolean;

  /** Disable normalization detection */
  disableNormalization?: boolean;

  /** Disable injection-pattern detection */
  disableInjectionPatterns?: boolean;
}

/**
 * Execution context for scanning text fragments.
 *
 * Used when scanning partial content extracted from a larger source.
 */
export interface ScanContext {
  /**
   * Base line offset.
   * @default 1
   */
  baseLine?: number;

  /**
   * Base column offset.
   * @default 1
   */
  baseCol?: number;

  /**
   * Precomputed line offsets for performance.
   */
  lineOffsets?: number[];
}

/**
 * Detector function contract.
 *
 * Detectors must be:
 * - deterministic
 * - side-effect free
 * - synchronous
 */
export type Detector = (
  text: string,
  options: ScanOptions,
  context: ScanContext,
) => ThreatReport[];

/**
 * Performance metrics for a scan.
 */
export interface ScanStats {
  durationMs: number;
  totalChars: number;
}

/**
 * Result returned by the scanner.
 */
export interface ScanResult {
  threats: ThreatReport[];
  stats: ScanStats;
  isClean: boolean;
}
