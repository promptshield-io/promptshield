import { performance } from "node:perf_hooks";
import { scanHomoglyphs } from "./homoglyph";
import { scanInjectionPatterns } from "./injection-patterns";
import { scanInvisibleChars } from "./invisible";
import { scanNormalization } from "./normalization";
import { scanSmuggling } from "./smuggling";
import { scanTrojanSource } from "./trojan";
import type {
  Detector,
  ScanContext,
  ScanOptions,
  ScanResult,
  ThreatReport,
} from "./types";

export * from "./homoglyph";
export * from "./injection-patterns";
export * from "./invisible";
export * from "./normalization";
export * from "./smuggling";
export * from "./trojan";
export * from "./types";

/**
 * Core scanning entry point.
 *
 * Executes all enabled detectors in priority order:
 *
 * 1. Trojan Source (BIDI logic manipulation)
 * 2. Invisible characters
 * 3. Homoglyph spoofing
 * 4. Unicode normalization anomalies
 * 5. Smuggling techniques
 *
 * The provided `context` object is shared across detectors and may be
 * mutated for performance optimizations (e.g., caching line offsets).
 *
 * @example
 * ```ts
 * import { scan } from '@promptshield/core';
 *
 * const result = scan("Hello\u200BWorld");
 * if (!result.isClean) {
 *   console.log(result.threats);
 * }
 * ```
 */
export const scan = (
  text: string,
  options: ScanOptions = {},
  context: ScanContext = {},
): ScanResult => {
  const start = performance.now();
  const threats: ThreatReport[] = [];

  const detectors: Detector[] = [];

  if (!options.disableTrojan) detectors.push(scanTrojanSource);
  if (!options.disableInvisible) detectors.push(scanInvisibleChars);
  if (!options.disableHomoglyphs) detectors.push(scanHomoglyphs);
  if (!options.disableNormalization) detectors.push(scanNormalization);
  if (!options.disableSmuggling) detectors.push(scanSmuggling);
  if (!options.disableInjectionPatterns) detectors.push(scanInjectionPatterns);

  for (const detector of detectors) {
    const detectorThreats = detector(text, options, context);
    threats.push(...detectorThreats);

    if (options.stopOnFirstThreat && detectorThreats.length > 0) {
      break;
    }
  }

  const end = performance.now();

  return {
    threats,
    stats: {
      durationMs: end - start,
      totalChars: text.length,
    },
    isClean: threats.length === 0,
  };
};
