import type { Severity, ThreatReport } from "@promptshield/core";
import { type Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";

/**
 * Maps PromptShield severity to LSP DiagnosticSeverity.
 */
export const SEVERITY_MAP: Record<Severity, DiagnosticSeverity> = {
  CRITICAL: DiagnosticSeverity.Error,
  HIGH: DiagnosticSeverity.Warning,
  MEDIUM: DiagnosticSeverity.Information,
  LOW: DiagnosticSeverity.Hint,
};

/**
 * Convert a ThreatReport into an LSP Diagnostic.
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
    code: report.category,
    data: report,
  };
};

/**
 * Convert multiple ThreatReports to diagnostics.
 */
export const convertReportsToDiagnostics = (
  reports: ThreatReport[],
  document: TextDocument,
): Diagnostic[] => reports.map((r) => convertReportToDiagnostic(r, document));
