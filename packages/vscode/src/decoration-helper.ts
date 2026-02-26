import type { ThreatReport } from "@promptshield/core";
import * as vscode from "vscode";

/**
 * Creates a rich hover message for a diagnostic's threats.
 * Optimizes specifically for the primary threat while summarizing others.
 */
export function createHoverMessageAndLabel(
  diagnostic: vscode.Diagnostic,
  isUnusedIgnore: boolean,
): {
  label: string;
  hoverMessage: vscode.MarkdownString;
} {
  if (isUnusedIgnore) {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.appendMarkdown(
      `### $(warning) PromptShield: Unused Ignore Directive\n\nThis \`promptshield-ignore\` directive is not suppressing any threats and can be safely removed.\n\n**Warning:** Leaving unused ignore directives in your code may accidentally suppress future threats that are introduced nearby.\n\n`,
    );
    return {
      label: "Unused `promptshield-ignore` directive",
      hoverMessage: md,
    };
  }
  const threats =
    (diagnostic as unknown as { data: ThreatReport[] }).data || [];

  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportThemeIcons = true;

  threats.forEach((threat) => {
    const icon =
      threat.severity === "CRITICAL" || threat.severity === "HIGH"
        ? "$(alert)"
        : "$(shield)";

    // Header
    md.appendMarkdown(
      `### ${icon} PromptShield: ${threat.category} (${threat.ruleId})\n\n**Severity:** \`${threat.severity}\`\n\n${threat.message} \n\n[$(book) Learn more](${threat.referenceUrl})\n\n`,
    );

    if (threat.readableLabel) {
      md.appendMarkdown(
        `*Invisible/Obfuscated Text:* \`${threat.readableLabel}\`\n\n`,
      );
    }
    md.appendMarkdown(`*Offending Text:* \`${threat.offendingText}\`\n\n`);

    if (threat.decodedPayload) {
      md.appendMarkdown(`*Decoded Payload:* \`${threat.decodedPayload}\`\n\n`);
    }

    md.appendMarkdown(`\n\n---\n\n`);
  });

  return { label: diagnostic.message, hoverMessage: md };
}
