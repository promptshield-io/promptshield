/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { CMD_SCAN_WORKSPACE } from "./extension";

// Mocks
const mocks = vi.hoisted(() => {
  return {
    LanguageClient: {
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
      sendRequest: vi.fn(),
      onNotification: vi.fn(),
    },
    DecorationManager: {
      activate: vi.fn(),
      getAllThreats: vi.fn(() => []),
    },
    PromptShieldStatusBar: class {
      setLoading = vi.fn();
    },
  };
});

vi.mock("vscode", () => ({
  ExtensionContext: class {},
  workspace: {
    createFileSystemWatcher: vi.fn(),
    openTextDocument: vi.fn(),
    applyEdit: vi.fn(),
  },
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showQuickPick: vi.fn(),
    activeTextEditor: {
      document: {
        uri: { toString: () => "file:///test.ts" },
        positionAt: (i: number) => ({ line: 0, character: i }),
        lineAt: () => ({ text: "code context" }),
      },
      revealRange: vi.fn(),
    },
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  Uri: { parse: vi.fn() },
  Range: class {},
  Position: class {},
  Selection: class {},
  lm: {
    selectChatModels: vi.fn(),
  },
  LanguageModelChatMessage: { User: vi.fn() },
  CancellationTokenSource: class {
    token = {};
  },
  WorkspaceEdit: class {
    replace = vi.fn();
  },
  TextEditorRevealType: { InCenter: 1 },
  languages: {
    getDiagnostics: vi.fn(() => []),
    onDidChangeDiagnostics: vi.fn(() => ({ dispose: vi.fn() })),
  },
}));

vi.mock("@promptshield/lsp", () => ({
  CMD_SERVER_SCAN_WORKSPACE: "promptshield.server.scanWorkspace",
  SOURCE: "PromptShield",
  NOTIFY_SCAN_COMPLETED: "promptshield/scanCompleted",
}));

vi.mock("@promptshield/workspace", () => ({
  IGNORE_FILES: [".promptshieldignore", ".psignore", ".gitignore"],
  PROMPT_SHIELD_REPORT_FILE: "promptshield-report.md",
  PROMPT_SHIELD_CACHE_FILE: ".promptshield-cache.json",
}));

vi.mock("./decoration-manager", () => ({
  DecorationManager: class {
    activate = mocks.DecorationManager.activate;
    getAllThreats = mocks.DecorationManager.getAllThreats;
  },
}));

vi.mock("./status-bar", () => ({
  PromptShieldStatusBar: mocks.PromptShieldStatusBar,
  CMD_SHOW_MENU: "promptshield.showMenu",
}));

vi.mock("path", () => ({
  join: vi.fn(),
}));

vi.mock("vscode-languageclient/node", () => ({
  LanguageClient: class {
    start = mocks.LanguageClient.start;
    stop = mocks.LanguageClient.stop;
    sendRequest = mocks.LanguageClient.sendRequest;
    onNotification = mocks.LanguageClient.onNotification;
  },
  ExecuteCommandRequest: { type: "type" },
  TransportKind: { ipc: 1 },
}));

describe("VSCode Extension", () => {
  const context = {
    subscriptions: [],
    asAbsolutePath: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should activate extension", async () => {
    const { activate } = await import("./extension");
    activate(context);

    expect(mocks.LanguageClient.start).toHaveBeenCalled();
    expect(mocks.DecorationManager.activate).toHaveBeenCalled();
    expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(6);
  });

  it("should deactivate extension", async () => {
    const { activate, deactivate } = await import("./extension");
    activate(context);
    await deactivate();
    expect(mocks.LanguageClient.stop).toHaveBeenCalled();
  });

  it("should handle promptshield.scanWorkspace command", async () => {
    const { activate } = await import("./extension");
    activate(context);
    // Find handler
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find((c) => c[0] === CMD_SCAN_WORKSPACE)?.[1];

    if (handler) {
      await handler();
      expect(mocks.LanguageClient.sendRequest).toHaveBeenCalledWith(
        "type",
        expect.objectContaining({
          command: "promptshield.server.scanWorkspace",
        }),
      );
    } else {
      throw new Error("Handler not found");
    }
  });

  it("should handle promptshield.showDetailedReport command with no editor", async () => {
    const { activate } = await import("./extension");
    // Mock activeTextEditor as undefined
    vi.mocked(vscode.window).activeTextEditor = undefined;
    activate(context);

    // Find and execute handler
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find(
      (c) => c[0] === "promptshield.showDetailedReport",
    )?.[1];

    if (handler) {
      await handler();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "No active editor.",
      );
    }
  });

  it("should handle promptshield.showDetailedReport command with no threats", async () => {
    const { activate } = await import("./extension");
    // Mock activeTextEditor
    vi.mocked(vscode.window).activeTextEditor = {
      document: { uri: { toString: () => "file:///test.ts" } },
    } as any;
    mocks.DecorationManager.getAllThreats.mockReturnValue([]);
    activate(context);

    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find(
      (c) => c[0] === "promptshield.showDetailedReport",
    )?.[1];

    if (handler) {
      await handler();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "No PromptShield threats detected in this file.",
      );
    }
  });

  it("should handle promptshield.showDetailedReport command with threats and selection", async () => {
    const { activate } = await import("./extension");
    // Mock activeTextEditor
    const revealRange = vi.fn();
    const editor = {
      document: {
        uri: { toString: () => "file:///test.ts" },
        positionAt: (i: number) => ({ line: 0, character: i }),
      },
      revealRange,
    } as any;
    vi.mocked(vscode.window).activeTextEditor = editor;

    const threat = {
      severity: "CRITICAL",
      category: "Invisible",
      loc: { line: 1, column: 1, index: 0 },
      message: "Test threat",
    };

    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      { source: "PromptShield", data: [threat] } as any,
    ]);

    // Mock QuickPick selection
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({ threat } as any);

    activate(context);

    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find(
      (c) => c[0] === "promptshield.showDetailedReport",
    )?.[1];

    if (handler) {
      await handler();
      expect(vscode.window.showQuickPick).toHaveBeenCalled();
      expect(revealRange).toHaveBeenCalled();
    }
  });

  it("should return early from deactivate if client is undefined", async () => {
    // Force a fresh import so activate is never called in this context
    vi.resetModules();
    const { deactivate } = await import("./extension");
    const result = deactivate();
    expect(result).toBeUndefined();
  });
});
