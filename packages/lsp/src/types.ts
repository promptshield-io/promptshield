import type { Severity } from "@promptshield/core";
import type { CacheMode } from "@promptshield/workspace";

/**
 * Configuration for the PromptShield language server.
 *
 * This controls validation behavior, performance characteristics,
 * and editor feedback strategies.
 */
export interface LspConfig {
  /**
   * Debounce duration (ms) before validation runs after a document change.
   * Prevents excessive scans during rapid typing.
   *
   * @default 400
   */
  debounceMs: number;

  /**
   * Maximum file size (in bytes) to validate.
   * Large files can degrade editor responsiveness.
   *
   * Set to `0` to disable validation limits.
   *
   * @default 200_000
   */
  maxFileSize?: number;

  /**
   * Enable validation on document change events.
   *
   * @default true
   */
  validateOnChange?: boolean;

  /**
   * Enable validation when a document is opened.
   *
   * @default true
   */
  validateOnOpen?: boolean;

  /**
   * Enable validation when a document is saved.
   *
   * @default true
   */
  validateOnSave?: boolean;
  /**
   * Disable inline ignore rules in comments (e.g., // promptshield-ignore).
   *
   * @default false
   */
  noInlineIgnore?: boolean;

  /**
   * Minimum severity to report.
   *
   * @default "LOW"
   */
  minSeverity?: Severity;

  /**
   * Cache mode for scan results.
   *
   * @default "auto"
   */
  cacheMode?: CacheMode | "none";
}

/**
 * Context passed to validation routines.
 * Allows future expansion without breaking API.
 */
export interface ValidationContext {
  uri?: string;
  languageId?: string;
}

export const DEFAULT_CONFIG: Required<LspConfig> = {
  debounceMs: 400,
  maxFileSize: 200_000,
  validateOnChange: true,
  validateOnOpen: true,
  validateOnSave: true,
  noInlineIgnore: false,
  minSeverity: "LOW",
  cacheMode: "auto",
};
