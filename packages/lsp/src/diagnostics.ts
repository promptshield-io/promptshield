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
 * Converts a ThreatReport to an LSP Diagnostic.
 */
export const convertReportToDiagnostic = (
  report: ThreatReport,
  _document: TextDocument,
): Diagnostic => {
  // Core reports have 1-based line numbers, LSP uses 0-based.
  const startLine = report.loc.line - 1;
  const startChar = report.loc.column - 1;

  const range = {
    start: {
      line: startLine,
      character: startChar,
    },
    end: {
      line: startLine,
      character: startChar + report.offendingText.length,
    },
  };

  return {
    severity: SEVERITY_MAP[report.severity],
    range,
    message: report.message,
    source: "PromptShield",
    code: report.category,
    data: report, // Pass full report to client for decorations
  };
};

export const convertReportsToDiagnostics = (
  reports: ThreatReport[],
  document: TextDocument,
): Diagnostic[] => {
  return reports.map((report) => convertReportToDiagnostic(report, document));
};
