import type { Severity, ThreatReport } from "@promptshield/core";
import { type Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";

/**
 * Maps PromptShield severity levels to LSP DiagnosticSeverity.
 *
 * This mapping controls how editors visually present findings:
 * - CRITICAL → Error
 * - HIGH → Warning
 * - MEDIUM → Information
 * - LOW → Hint
 */
export const SEVERITY_MAP: Record<Severity, DiagnosticSeverity> = {
  CRITICAL: DiagnosticSeverity.Error,
  HIGH: DiagnosticSeverity.Warning,
  MEDIUM: DiagnosticSeverity.Information,
  LOW: DiagnosticSeverity.Hint,
};

/**
 * Convert a ThreatReport into an LSP Diagnostic.
 *
 * Design notes:
 * - PromptShield locations are 1-based; LSP is 0-based.
 * - `ruleId` is preferred for the diagnostic code.
 * - The full ThreatReport is attached via `data` so the
 *   VSCode extension can reconstruct decorations and actions.
 */
export const convertReportToDiagnostic = (
  report: ThreatReport,
  _document: TextDocument,
): Diagnostic => {
  const startLine = report.loc.line - 1;
  const startChar = report.loc.column - 1;

  return {
    severity: SEVERITY_MAP[report.severity],
    range: {
      start: { line: startLine, character: startChar },
      end: {
        line: startLine,
        character: startChar + report.offendingText.length,
      },
    },
    message: report.message,
    source: "PromptShield",
    code: report.ruleId,
    data: report,
  };
};

/**
 * Convert multiple ThreatReports into LSP diagnostics.
 */
export const convertReportsToDiagnostics = (
  reports: ThreatReport[],
  document: TextDocument,
): Diagnostic[] =>
  reports.map((report) => convertReportToDiagnostic(report, document));
