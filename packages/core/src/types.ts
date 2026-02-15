/**
 * Severity levels for detected threats.
 * - LOW: Informational or minor issues (e.g., hidden comments).
 * - MEDIUM: Suspicious patterns that require attention (e.g., Base64 strings).
 * - HIGH: Likely malicious or dangerous characters (e.g., invisible characters).
 * - CRITICAL: Confirmed high-risk attack vectors (e.g., homoglyph spoofing).
 */
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Categories of threats detected by the engine.
 */
export enum ThreatCategory {
  /**
   * Invisible characters like Zero Width Spaces, BIDI controls, etc.
   */
  Invisible = "INVISIBLE_CHAR",
  /**
   * Characters from mixed scripts that can look identical to others (e.g. Cyrillic 'a' vs Latin 'a').
   */
  Homoglyph = "HOMOGLYPH",
  /**
   * Techniques used to hide data or instructions, such as Base64 encoding or hidden Markdown.
   */
  Smuggling = "SMUGGLING",
  /**
   * Reserved for future prompt injection detection.
   */
  Injection = "PROMPT_INJECTION",
  /**
   * Trojan Source attacks (CVE-2021-42574) using BIDI overrides to manipulate logic.
   */
  Trojan = "TROJAN_SOURCE",
  /**
   * Unicode Normalization attacks where visual characters differ from code points.
   */
  Normalization = "NORMALIZATION",
}

/**
 * Location of a threat within the source text.
 */
export interface ThreatLoc {
  /** 1-based line number */
  line: number;
  /** 1-based column number */
  column: number;
  /** 0-based character index */
  index: number;
}

/**
 * Report detailing a single detected threat.
 */
export interface ThreatReport {
  /** The category of the threat. */
  category: ThreatCategory;
  /** The severity level of the threat. */
  severity: Severity;
  /** A human-readable message describing the threat. */
  message: string;
  /** The specific location of the threat. */
  loc: ThreatLoc;
  /** The exact substring that triggered the detection. */
  offendingText: string;
  /** A readable label for invisible or confusing characters (e.g., "[ZWSP]"). */
  readableLabel?: string;
  /** Actionable suggestion for the user. */
  suggestion?: string;
}

/**
 * Options to configure the scanning process.
 */
export interface ScanOptions {
  /**
   * If true, the scanner will stop immediately after finding the first threat.
   * Useful for "fail-fast" validations where performance is critical.
   * @default false
   */
  stopOnFirstThreat?: boolean;

  /**
   * Only report threats with severity equal to or higher than this threshold.
   * Priority: LOW < MEDIUM < HIGH < CRITICAL
   * @default "LOW"
   */
  minSeverity?: Severity;

  /**
   * Disable default detectors.
   */
  disableInvisible?: boolean;
  disableHomoglyphs?: boolean;
  disableSmuggling?: boolean;
  disableTrojan?: boolean;
  disableNormalization?: boolean;
}

/**
 * Execution context for a scan operation.
 *
 * Provides positional metadata when scanning text that originates
 * from a larger document (e.g., code blocks, diff hunks, AST nodes,
 * streamed content, or IDE buffers).
 *
 * All fields are optional. The scanner will fall back to defaults
 * when values are not provided.
 */
export interface ScanContext {
  /**
   * Line offset to apply when reporting locations.
   *
   * Useful when scanning a substring that begins later in a file.
   * Defaults to `1`.
   */
  baseLine?: number;

  /**
   * Column offset to apply when reporting locations.
   *
   * Used when the scanned text does not begin at column 1.
   * Defaults to `1`.
   */
  baseCol?: number;

  /**
   * Precomputed line start offsets for the scanned text.
   *
   * This is an optional performance optimization that allows the
   * core scanner to compute line offsets once and share them across
   * detectors instead of recomputing per detector.
   */
  lineOffsets?: number[];
}

export type Detector = (
  text: string,
  options: ScanOptions,
  context: ScanContext,
) => ThreatReport[];

/**
 * Performance statistics for a scan operation.
 */
export interface ScanStats {
  /** Time taken to scan in milliseconds. */
  durationMs: number;
  /** Total number of characters scanned. */
  totalChars: number;
}

/**
 * The complete result of a scan operation.
 */
export interface ScanResult {
  /** List of detected threats. */
  threats: ThreatReport[];
  /** Performance statistics. */
  stats: ScanStats;
  /** True if no threats were found. */
  isClean: boolean;
}
