import {
  type Severity,
  ThreatCategory,
  type ThreatReport,
} from "@promptshield/core";
import { describe, expect, it } from "vitest";
import { DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { convertReportToDiagnostic } from "./diagnostics";

const createThreat = (severity: Severity): ThreatReport => ({
  category: ThreatCategory.Invisible,
  severity,
  message: "Test message",
  offendingText: "bad",
  loc: {
    line: 1,
    column: 1,
    index: 0,
  },
});

const mockDoc = TextDocument.create(
  "file:///test.txt",
  "plaintext",
  1,
  "bad content",
);

describe("LSP Diagnostics", () => {
  it("should map CRITICAL severity to Error", () => {
    const threat = createThreat("CRITICAL");
    const diagnostic = convertReportToDiagnostic(threat, mockDoc);
    expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
  });

  it("should map HIGH severity to Warning", () => {
    const threat = createThreat("HIGH");
    const diagnostic = convertReportToDiagnostic(threat, mockDoc);
    expect(diagnostic.severity).toBe(DiagnosticSeverity.Warning);
  });

  it("should map MEDIUM severity to Information", () => {
    const threat = createThreat("MEDIUM");
    const diagnostic = convertReportToDiagnostic(threat, mockDoc);
    expect(diagnostic.severity).toBe(DiagnosticSeverity.Information);
  });

  it("should map LOW severity to Hint", () => {
    const threat = createThreat("LOW");
    const diagnostic = convertReportToDiagnostic(threat, mockDoc);
    expect(diagnostic.severity).toBe(DiagnosticSeverity.Hint);
  });

  it("should include full ThreatReport in data field", () => {
    const threat = createThreat("HIGH");
    const diagnostic = convertReportToDiagnostic(threat, mockDoc);
    expect(diagnostic.data).toEqual(threat);
  });

  it("should map range correctly (0-indexed)", () => {
    const threat = createThreat("HIGH");
    // threat loc is 1-based line/col: 1, 1.
    // offendingText len: 3.
    // Expected range: line 0, char 0 to line 0, char 3.
    const diagnostic = convertReportToDiagnostic(threat, mockDoc);
    expect(diagnostic.range).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 3 },
    });
  });
});
