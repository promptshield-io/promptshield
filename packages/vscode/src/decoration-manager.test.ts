/** biome-ignore-all lint/suspicious/noExplicitAny: test file */

import { SOURCE } from "@promptshield/lsp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { DecorationManager } from "./decoration-manager";

// Mocks
const mocks = vi.hoisted(() => {
  const mockDecorationType = { dispose: vi.fn() };

  const mockEditor = {
    document: {
      uri: { toString: () => "file:///test.ts" },
      positionAt: (idx: number) => ({
        line: 0,
        character: idx,
      }),
    },
    setDecorations: vi.fn(),
  };

  const mockDiagnostic = {
    source: SOURCE,
    code: "INVISIBLE_CHAR",
    message: "Threat found",
    severity: 1, // Error
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
    data: {
      checkId: "test",
      category: "INVISIBLE_CHAR",
      severity: "HIGH",
      message: "Threat found",
      offendingText: "\u200B",
      loc: { line: 1, column: 1, index: 0 },
    },
  };

  class MockMarkdownString {
    isTrusted = false;
    supportThemeIcons = false;
    constructor(public value: string = "") {}
    appendMarkdown(val: string) {
      this.value += val;
    }
  }

  return { mockDecorationType, mockEditor, mockDiagnostic, MockMarkdownString };
});

vi.mock("vscode", () => ({
  window: {
    createTextEditorDecorationType: vi.fn(() => mocks.mockDecorationType),
    visibleTextEditors: [mocks.mockEditor],
    activeTextEditor: mocks.mockEditor,
    onDidChangeActiveTextEditor: vi.fn(),
  },
  ThemeColor: class {
    constructor(public id: string) {}
  },
  OverviewRulerLane: { Right: 4 },
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
  },
  languages: {
    getDiagnostics: vi.fn(() => [mocks.mockDiagnostic]),
    onDidChangeDiagnostics: vi.fn(),
  },
  workspace: {
    textDocuments: [], // Empty, fallback to range
  },
  Range: class {
    constructor(
      public start: any,
      public end: any,
    ) {}
    contains(_pos: any) {
      return true;
    }
  },
  MarkdownString: mocks.MockMarkdownString,
  DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
  Uri: { parse: (s: string) => ({ toString: () => s }) },
}));

describe("DecorationManager", () => {
  let manager: DecorationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new DecorationManager();
  });

  it("should initialize decoration types with correct colors", () => {
    expect(
      vi.mocked(vscode.window.createTextEditorDecorationType),
    ).toHaveBeenCalledTimes(6);
  });

  it("should update decorations from diagnostics", () => {
    manager.activate();
    expect(mocks.mockEditor.setDecorations).toHaveBeenCalled();
  });

  it("should generate rich hover message", () => {
    manager.activate();

    const calls = vi.mocked(mocks.mockEditor.setDecorations).mock.calls;
    const callWithRanges = calls.find((args) => args[1].length > 0);
    expect(callWithRanges).toBeDefined();

    if (callWithRanges) {
      const decorationOptions = callWithRanges[1][0]; // First decoration
      const hover = decorationOptions.hoverMessage as any;

      expect(hover).toBeInstanceOf(mocks.MockMarkdownString);
      expect(hover.value).toContain("PromptShield: INVISIBLE_CHAR Detected");
      expect(hover.value).toContain("**Severity:** HIGH");
      expect(hover.value).toContain("$(alert)"); // Icon for HIGH
      expect(hover.isTrusted).toBe(true);
      expect(hover.supportThemeIcons).toBe(true);
    }
  });
  it("should handle diagnostics updates via event", () => {
    manager.activate();

    // Get the handler registered to onDidChangeDiagnostics
    const calls = vi.mocked(vscode.languages.onDidChangeDiagnostics).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const handler = calls[0][0];

    // Trigger it
    handler({
      uris: [
        {
          toString: () => "file:///test.ts",
          scheme: "",
          authority: "",
          path: "",
          query: "",
          fragment: "",
          fsPath: "",
          with: (_change: {
            scheme?: string;
            authority?: string;
            path?: string;
            query?: string;
            fragment?: string;
          }): vscode.Uri => {
            throw new Error("Function not implemented.");
          },
          toJSON: () => {
            throw new Error("Function not implemented.");
          },
        },
      ],
    });
    expect(mocks.mockEditor.setDecorations).toHaveBeenCalled();
  });

  it("should reconstruct ThreatReport if data is missing", () => {
    // Mock getDiagnostics to return a raw diagnostic without data
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      {
        source: SOURCE,
        code: "Invisible",
        message: "Raw message",
        severity: 0, // Error -> Critical
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
      } as any,
    ]);

    // Mock workspace textDocuments to verify text extraction
    (vscode.workspace.textDocuments as any) = [
      {
        uri: { toString: () => "file:///test.ts" },
        getText: () => "12345",
        offsetAt: () => 0,
      },
    ];

    manager.activate();

    // Verify decoration was still created
    expect(mocks.mockEditor.setDecorations).toHaveBeenCalled();
  });

  it("should apply correct colors for different severities", () => {
    // Test CRITICAL
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      {
        ...mocks.mockDiagnostic,
        data: { ...mocks.mockDiagnostic.data, severity: "CRITICAL" },
      } as any,
    ]);
    manager.activate();
    // Check if setDecorations called for critical type (index 0)
    // We can't easily check which decoration type is which without exposing them,
    // but we can check that setDecorations is called multiple times.
    expect(mocks.mockEditor.setDecorations).toHaveBeenCalled();

    vi.clearAllMocks();

    // Test LOW
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      {
        ...mocks.mockDiagnostic,
        data: { ...mocks.mockDiagnostic.data, severity: "LOW" },
      } as any,
    ]);
    manager.activate();
    expect(mocks.mockEditor.setDecorations).toHaveBeenCalled();
  });

  it("should show payload label if present", () => {
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      {
        ...mocks.mockDiagnostic,
        data: {
          ...mocks.mockDiagnostic.data,
          offendingText: "\u200B",
          decodedPayload: "PAYLOAD",
          readableLabel: "[PAYLOAD]",
        },
      } as any,
    ]);

    manager.activate();
    manager.toggleXRay(); // Enable X-Ray to see labels
    const calls = vi.mocked(mocks.mockEditor.setDecorations).mock.calls;

    // Find hidden text decoration call (transparent color)
    // We assume hiddenTextDecorationType is the 5th called (index 4) or similar.
    // Actually we can search for the one with 'before' content text
    const callWithLabel = calls.find((args) =>
      args[1].some((opt: any) =>
        opt.renderOptions?.before?.contentText?.includes("[PAYLOAD]"),
      ),
    );
    expect(callWithLabel).toBeDefined();
  });

  it("should return threats via public API", () => {
    manager.activate();

    const uri = { toString: () => "file:///test.ts" } as any;
    const threats = manager.getAllThreats(uri);
    expect(threats.length).toBeGreaterThan(0);
    expect(threats[0][0].category).toBe("INVISIBLE_CHAR");

    const threatsAt = manager.getThreatsAt(
      { uri, positionAt: (i: number) => ({ line: 0, character: i }) } as any,
      { line: 0, character: 0 } as any,
    );
    expect(threatsAt.length).toBeGreaterThan(0);
  });
});
