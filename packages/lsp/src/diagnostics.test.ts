import {
  type Severity,
  ThreatCategory,
  type ThreatReport,
} from "@promptshield/core";
import { describe, expect, it } from "vitest";
import { DiagnosticSeverity } from "vscode-languageserver";
import { convertReportsToDiagnostics } from "./diagnostics";

const createThreat = (severity: Severity): ThreatReport => ({
  category: ThreatCategory.Invisible,
  ruleId: "PSU001",
  severity,
  message: "Test message",
  offendingText: "bad",
  loc: {
    line: 1,
    column: 1,
    index: 0,
  },
  referenceUrl: "https://example.com/rule",
});

describe("LSP Diagnostics", () => {
  it("should map CRITICAL severity to Error", () => {
    const threat = createThreat("CRITICAL");
    const diagnostics = convertReportsToDiagnostics([threat]);
    expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
  });

  it("should map HIGH severity to Warning", () => {
    const threat = createThreat("HIGH");
    const diagnostics = convertReportsToDiagnostics([threat]);
    expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
  });

  it("should map MEDIUM severity to Information", () => {
    const threat = createThreat("MEDIUM");
    const diagnostics = convertReportsToDiagnostics([threat]);
    expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Information);
  });

  it("should map LOW severity to Hint", () => {
    const threat = createThreat("LOW");
    const diagnostics = convertReportsToDiagnostics([threat]);
    expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Hint);
  });

  it("should include array of ThreatReports in data field", () => {
    const threat = createThreat("HIGH");
    const diagnostics = convertReportsToDiagnostics([threat]);
    expect(diagnostics[0].data).toEqual([threat]);
  });

  it("should map range correctly (0-indexed)", () => {
    const threat = createThreat("HIGH");
    // threat loc is 1-based line/col: 1, 1.
    // offendingText len: 3.
    // Expected range: line 0, char 0 to line 0, char 3.
    const diagnostics = convertReportsToDiagnostics([threat]);
    expect(diagnostics[0].range).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 3 },
    });
  });

  it("should group multiple threats by location and set severity by the worst threat", () => {
    const criticalThreat = createThreat("CRITICAL");
    const lowThreat = createThreat("LOW");
    const diagnostics = convertReportsToDiagnostics([
      lowThreat,
      criticalThreat,
    ]);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
    expect(diagnostics[0].data).toEqual([criticalThreat, lowThreat]); // Sorted by severity
    expect(diagnostics[0].message).toContain("[Multiple Threats]");
  });
});
