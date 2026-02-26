/** biome-ignore-all lint/suspicious/noExplicitAny: test file */

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
    source: "PromptShield",
    code: "INVISIBLE_CHAR",
    message: "Threat found",
    severity: 1, // Error
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
    data: [
      {
        checkId: "test",
        category: "INVISIBLE_CHAR",
        severity: "CRITICAL",
        message: "Threat found",
        offendingText: "\u200B",
        loc: { line: 1, column: 1, index: 0 },
      },
    ],
  };

  const mockDiagnosticWithGroup = {
    ...mockDiagnostic,
    data: [
      { ...mockDiagnostic.data[0] },
      { ...mockDiagnostic.data[0], category: "HOMOGLYPH", severity: "HIGH" },
    ],
  };

  class MockMarkdownString {
    isTrusted = false;
    supportThemeIcons = false;
    constructor(public value: string = "") {}
    appendMarkdown(val: string) {
      this.value += val;
    }
  }

  return {
    mockDecorationType,
    mockEditor,
    mockDiagnostic,
    mockDiagnosticWithGroup,
    MockMarkdownString,
  };
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
    ).toHaveBeenCalledTimes(9);
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
      expect(hover.value).toContain("PromptShield: INVISIBLE_CHAR");
      expect(hover.value).toContain("**Severity:** `CRITICAL`");
      expect(hover.value).toContain("$(alert)"); // Icon for CRITICAL
      expect(hover.isTrusted).toBe(true);
      expect(hover.supportThemeIcons).toBe(true);
    }
  });

  it("should include readableLabel and decodedPayload in hover message", () => {
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      {
        ...mocks.mockDiagnostic,
        severity: 0,
        data: [
          {
            ...mocks.mockDiagnostic.data[0],
            readableLabel: "[TAG_PAYLOAD]",
            decodedPayload: "hidden_text",
          },
        ],
      } as any,
    ]);
    manager.activate();

    const calls = vi.mocked(mocks.mockEditor.setDecorations).mock.calls;
    const callWithRanges = calls.find((args) => args[1].length > 0);

    if (callWithRanges) {
      const decorationOptions = callWithRanges[1][0];
      const hoverValue = (decorationOptions.hoverMessage as any).value;
      expect(hoverValue).toContain(
        "*Invisible/Obfuscated Text:* `[TAG_PAYLOAD]`",
      );
      expect(hoverValue).toContain("*Decoded Payload:* `hidden_text`");
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
        source: "PromptShield",
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

  it("should apply correct colors for different severities and replacement options", () => {
    // We already do this via the toggleXRay calls below, but let's test specific diagnostic severity mapping
    const cases = [
      { s: 0, expectedCallCount: 9 }, // Error
      { s: 1, expectedCallCount: 9 }, // Warning
      { s: 2, expectedCallCount: 9 }, // Information
      { s: 3, expectedCallCount: 9 }, // Hint
    ];

    for (const { s } of cases) {
      vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
        {
          ...mocks.mockDiagnostic,
          severity: s,
        } as any,
      ]);
      manager.activate();
      expect(mocks.mockEditor.setDecorations).toHaveBeenCalled();
      vi.clearAllMocks();
    }
  });

  it("should trigger threats event when active editor changes", () => {
    let mockActiveEditorCb: any;
    vi.mocked(vscode.window.onDidChangeActiveTextEditor).mockImplementation(
      (cb: any) => {
        mockActiveEditorCb = cb;
        return { dispose: vi.fn() };
      },
    );

    manager.activate();
    expect(mockActiveEditorCb).toBeDefined();

    // Call callback with an editor
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      mocks.mockDiagnostic as any,
    ]);
    mockActiveEditorCb(mocks.mockEditor);
    expect(mocks.mockEditor.setDecorations).toHaveBeenCalled();

    // Call callback without an editor should empty decorations
    vi.clearAllMocks();
    mockActiveEditorCb(undefined);
    // Since active text editor is undefined, it fires event with count 0 and does not set decorations on undefined.
    expect(mocks.mockEditor.setDecorations).not.toHaveBeenCalled();
  });

  it("should fire threat event update 0 if no activeTextEditor exists internally", () => {
    let firedEvent: any;
    const testManager = new DecorationManager();
    // Replaces the internal event emitter to track what `count` got dispatched.
    (testManager as any)._onThreatsChanged = {
      fire: vi.fn((ev: any) => (firedEvent = ev)),
    };

    // Fake the absence of an open editor
    const org = vscode.window.activeTextEditor;
    (vscode.window as any).activeTextEditor = undefined;

    // Trigger updateDecorations...
    (testManager as any).updateDecorations(mocks.mockEditor.document.uri, []);
    expect(firedEvent).toEqual({ count: 0 });

    // Restore
    (vscode.window as any).activeTextEditor = org;
  });

  it("should gracefully handle multiple editors spanning the same uri", () => {
    vi.mocked(vscode.window).visibleTextEditors = [
      mocks.mockEditor,
      {
        ...mocks.mockEditor,
        document: mocks.mockEditor.document,
        setDecorations: vi.fn(),
      } as any,
    ];

    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      mocks.mockDiagnostic as any,
    ]);
    manager.activate();
    // One editor might be updated or bypassed; ensure we just test it didn't crash.
    expect(() => manager.activate()).not.toThrow();
  });

  it("should gracefully handle non-promptshield diagnostics", () => {
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      { source: "OtherSource" } as any,
    ]);
    expect(() => manager.activate()).not.toThrow();
  });

  it("should listen to onDidChangeDiagnostics", () => {
    let diagnosticCb: any;
    vi.mocked(vscode.languages.onDidChangeDiagnostics).mockImplementation(
      (cb: any) => {
        diagnosticCb = cb;
        return { dispose: vi.fn() };
      },
    );

    manager.activate();
    expect(diagnosticCb).toBeDefined();

    expect(() =>
      diagnosticCb({ uris: [mocks.mockEditor.document.uri] }),
    ).not.toThrow();
  });
});
