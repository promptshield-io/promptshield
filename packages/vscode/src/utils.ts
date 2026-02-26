import type { ThreatReport } from "@promptshield/core";
import { PROMPTSHIELD_ARTIFACTS_DIR } from "@promptshield/workspace";

import type { Uri } from "vscode";

export const isPromptShieldArtifact = (uri: Uri) => {
  return uri.toString().split(/\/|\\/).includes(PROMPTSHIELD_ARTIFACTS_DIR);
};

export const getPrimaryThreat = (threats: ThreatReport[]) => {
  // Threats are pre-sorted by severity in the LSP diagnostics compiler
  return threats[0];
};
