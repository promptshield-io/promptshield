import {
  type ScanContext,
  type ScanOptions,
  ThreatCategory,
  type ThreatReport,
} from "./types";
import { getLineOffsets, getLocForIndex } from "./utils";

/**
 * Deterministic prompt-injection pattern detector.
 *
 * This detector identifies well-known prompt-injection phrases using:
 *
 * 1. Direct regex matching
 * 2. Normalized matching (spacing / punctuation removal)
 *
 * The detector intentionally avoids semantic analysis and focuses
 * only on structural instruction-override patterns.
 *
 * This keeps detection:
 * - deterministic
 * - explainable
 * - fast
 * - testable
 *
 * Supported patterns:
 * - ignore previous instructions
 * - reveal system prompt
 * - disable guardrails
 * - override system instructions
 *
 * Rule namespace:
 * PSI — PromptShield Injection
 */
const INJECTION_RULES: Array<{
  id: string;
  severity: "HIGH" | "CRITICAL";
  message: string;
  regex: RegExp;
  normalizedPattern: string;
}> = [
  {
    id: "PSI001",
    severity: "CRITICAL",
    message: "Prompt injection attempt: ignore previous instructions",
    regex: /ignore\s+previous\s+instructions/i,
    normalizedPattern: "ignorepreviousinstructions",
  },
  {
    id: "PSI002",
    severity: "CRITICAL",
    message: "Attempt to reveal system prompt",
    regex: /reveal\s+(system|hidden)\s+prompt/i,
    normalizedPattern: "revealsystemprompt",
  },
  {
    id: "PSI003",
    severity: "HIGH",
    message: "Attempt to disable guardrails",
    regex: /disable\s+(guardrails|safety)/i,
    normalizedPattern: "disableguardrails",
  },
  {
    id: "PSI004",
    severity: "HIGH",
    message: "System override instruction detected",
    regex: /override\s+(system|instructions)/i,
    normalizedPattern: "overridesysteminstructions",
  },
];

/**
 * Normalize text for injection detection.
 *
 * Removes punctuation, whitespace, and casing differences
 * so obfuscated spacing attacks can be detected deterministically.
 *
 * Example:
 * "I g n o r e   p r e v i o u s   i n s t r u c t i o n s"
 * → "ignorepreviousinstructions"
 */
const normalizeLine = (line: string): string => {
  return line
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, "");
};

/**
 * Scan for deterministic prompt-injection patterns.
 *
 * Detection strategy:
 * - Scan line-by-line for stable location reporting
 * - Attempt direct regex detection first
 * - Fall back to normalized detection
 *
 * Span semantics:
 *   offendingText = matched instruction phrase or entire line
 */
export const scanInjectionPatterns = (
  text: string,
  options: ScanOptions = {},
  context: ScanContext = {},
): ThreatReport[] => {
  const threats: ThreatReport[] = [];

  context.lineOffsets = context.lineOffsets ?? getLineOffsets(text);

  const lines = text.split("\n");
  let runningIndex = 0;

  for (const line of lines) {
    const normalized = normalizeLine(line);

    for (const rule of INJECTION_RULES) {
      /**
       * Direct regex detection
       */
      const directMatch = rule.regex.exec(line);

      if (directMatch) {
        threats.push({
          ruleId: rule.id,
          category: ThreatCategory.Injection,
          severity: rule.severity,
          message: rule.message,
          offendingText: directMatch[0],
          loc: getLocForIndex(runningIndex + directMatch.index, context),
          readableLabel: "[Injection]",
          suggestion:
            "Remove instruction-override language from prompts or user content.",
          referenceUrl: `https://promptshield.js.org/docs/detectors/injection-patterns#${rule.id}`,
        });

        if (options.stopOnFirstThreat) return threats;
        continue;
      }

      /**
       * Normalized detection (spacing obfuscation)
       */
      if (normalized.includes(rule.normalizedPattern)) {
        threats.push({
          ruleId: rule.id,
          category: ThreatCategory.Injection,
          severity: rule.severity,
          message: `${rule.message} (obfuscated spacing detected)`,
          offendingText: line.trim(),
          loc: getLocForIndex(runningIndex, context),
          readableLabel: "[Injection]",
          suggestion:
            "Obfuscated instruction detected. Inspect and remove malicious content.",
          referenceUrl: `https://promptshield.js.org/docs/detectors/injection-patterns#${rule.id}`,
        });

        if (options.stopOnFirstThreat) return threats;
      }
    }

    runningIndex += line.length + 1;
  }

  return threats;
};
