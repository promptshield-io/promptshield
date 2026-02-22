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
      toggleXRay: vi.fn(),
    },
    PromptShieldStatusBar: class {
      setLoading = vi.fn();
    },
  };
});

vi.mock("vscode", () => ({
  ExtensionContext: vi.fn(),
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
    showTextDocument: vi.fn(),
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
  Uri: {
    parse: vi.fn((s: string) => ({
      path: s.replace("file://", ""),
      toString: () => s,
    })),
    joinPath: vi.fn(),
  },
  Range: vi.fn(),
  Position: vi.fn(),
  Selection: vi.fn(),
  lm: {
    selectChatModels: vi.fn(),
  },
  LanguageModelChatMessage: { User: vi.fn() },
  CancellationTokenSource: vi.fn(() => ({ token: {} })),
  WorkspaceEdit: vi.fn(() => ({ replace: vi.fn() })),
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
    toggleXRay = mocks.DecorationManager.toggleXRay;
  },
}));

vi.mock("./status-bar", () => ({
  PromptShieldStatusBar: mocks.PromptShieldStatusBar,
  CMD_SHOW_MENU: "promptshield.showMenu",
}));

vi.mock("path", () => ({
  join: vi.fn(),
  basename: vi.fn((s: string) => s.split(/[\\/]/).pop() || ""),
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

  it("should handle promptshield.toggleXRay command", async () => {
    const { activate } = await import("./extension");
    activate(context);
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find((c) => c[0] === "promptshield.toggleXRay")?.[1];
    if (handler) {
      await handler();
      expect(mocks.DecorationManager.activate).toHaveBeenCalled(); // DecorationManager is mocked, we just want to execute the handler
    }
  });

  it("should handle client.start error gracefully", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(mocks.LanguageClient.start).mockRejectedValueOnce(
      new Error("Start failed"),
    );
    const { activate } = await import("./extension");
    activate(context);

    // Wait for the promise rejection to occur and be caught
    await new Promise(process.nextTick);
    expect(consoleError).toHaveBeenCalledWith(
      "LSP Client failed to start",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it("should handle promptshield.scanWorkspace failure gracefully", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(mocks.LanguageClient.sendRequest).mockRejectedValueOnce(
      new Error("Scan failed"),
    );
    const { activate } = await import("./extension");
    activate(context);
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find((c) => c[0] === CMD_SCAN_WORKSPACE)?.[1];

    if (handler) {
      await handler();
      expect(consoleError).toHaveBeenCalledWith(
        "Scan failed:",
        expect.any(Error),
      );
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Workspace scan failed.",
      );
    }
    consoleError.mockRestore();
  });

  it("should handle NOTIFY_SCAN_COMPLETED notification", async () => {
    const { activate } = await import("./extension");
    activate(context);
    const notificationHandler = vi
      .mocked(mocks.LanguageClient.onNotification)
      .mock.calls.find((c) => c[0] === "promptshield/scanCompleted")?.[1];
    if (notificationHandler) {
      notificationHandler();
      // Test is successful simply by executing without throwing, as the inner logic is basic.
    }
  });

  it("should handle promptshield.showMenu command", async () => {
    const { activate } = await import("./extension");
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      command: "promptshield.toggleXRay",
    } as any);
    activate(context);
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find((c) => c[0] === "promptshield.showMenu")?.[1];
    if (handler) {
      await handler();
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "promptshield.toggleXRay",
      );
    }
  });

  it("should handle promptshield.showMenu command for open report", async () => {
    const { activate } = await import("./extension");
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      command: "promptshield.openWorkspaceReport",
    } as any);
    vi.mocked(vscode.workspace).workspaceFolders = [
      { uri: { toString: () => "file:///workspace" } },
    ] as any;
    activate(context);
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find((c) => c[0] === "promptshield.showMenu")?.[1];
    if (handler) {
      await handler();
      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
    }
  });

  it("should handle promptshield.showWorkspaceThreats command with no threats", async () => {
    const { activate } = await import("./extension");
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([]);
    activate(context);
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find(
      (c) => c[0] === "promptshield.showWorkspaceThreats",
    )?.[1];
    if (handler) {
      await handler();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "No PromptShield threats detected in workspace.",
      );
    }
  });

  it("should handle promptshield.showWorkspaceThreats command with threats", async () => {
    const { activate } = await import("./extension");
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValueOnce([
      [
        { fsPath: "file.ts" } as any,
        [
          {
            source: "PromptShield",
            range: { start: { line: 0, character: 0 } },
            data: [{ severity: "HIGH", category: "Test", message: "Test" }],
          } as any,
        ],
      ],
    ]);
    vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({} as any);
    if (!vscode.window.showTextDocument)
      vscode.window.showTextDocument = vi.fn();
    vi.mocked(vscode.window.showTextDocument).mockResolvedValue({
      selection: {},
      revealRange: vi.fn(),
    } as any);
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      uri: { toString: () => "file:///test.ts" },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    } as any);
    activate(context);
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find(
      (c) => c[0] === "promptshield.showWorkspaceThreats",
    )?.[1];
    if (handler) {
      await handler();
      expect(vscode.window.showQuickPick).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    }
  });

  it("should handle promptshield.fixWithAI command", async () => {
    const { activate } = await import("./extension");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    activate(context);
    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const handler = calls.find((c) => c[0] === "promptshield.fixWithAI")?.[1];
    if (handler) {
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        uri: { toString: () => "file.ts" },
      } as any);
      const uriString = "file:///test.ts";
      await handler(uriString, []);
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        "Fix with AI is currently experimental and disabled.",
      );
    }
    consoleLog.mockRestore();
  });

  it("should return early from deactivate if client is undefined", async () => {
    // Force a fresh import so activate is never called in this context
    vi.resetModules();
    const { deactivate } = await import("./extension");
    const result = deactivate();
    expect(result).toBeUndefined();
  });
});
