import type { ThreatReport } from "@promptshield/core";

export const SEVERITY_SCORE = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
export const getPrimaryThreat = (threats: ThreatReport[]) => {
  // 1. Identify Primary Threat (Highest Severity)
  let maxSeverity: ThreatReport["severity"] = "LOW";
  let primaryThreat: ThreatReport = threats[0];

  for (const t of threats) {
    if (SEVERITY_SCORE[t.severity] > SEVERITY_SCORE[maxSeverity]) {
      maxSeverity = t.severity;
      primaryThreat = t;
    }
  }

  return primaryThreat;
};
