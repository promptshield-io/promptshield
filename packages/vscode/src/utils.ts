import type { ThreatReport } from "@promptshield/core";
import {
  PROMPT_SHIELD_CACHE_FILE,
  PROMPT_SHIELD_REPORT_FILE,
} from "@promptshield/workspace";
import type { Uri } from "vscode";

export const PROMPT_SHIELD_ARTIFACTS_REGEXP = new RegExp(
  `(${PROMPT_SHIELD_CACHE_FILE}|${PROMPT_SHIELD_REPORT_FILE})$`,
);

export const isPromptShieldArtifact = (uri: Uri) => {
  return PROMPT_SHIELD_ARTIFACTS_REGEXP.test(uri.toString());
};

export const getPrimaryThreat = (threats: ThreatReport[]) => {
  // Threats are pre-sorted by severity in the LSP diagnostics compiler
  return threats[0];
};
