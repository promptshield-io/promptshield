/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

// Mocks
const mocks = vi.hoisted(() => {
  return {
    LanguageClient: {
      start: vi.fn(),
      stop: vi.fn(),
    },
    DecorationManager: {
      activate: vi.fn(),
      getAllThreats: vi.fn(() => []),
    },
    PromptShieldStatusBar: vi.fn(),
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
}));

vi.mock("./decoration-manager", () => ({
  DecorationManager: class {
    activate = mocks.DecorationManager.activate;
    getAllThreats = mocks.DecorationManager.getAllThreats;
  },
}));

vi.mock("./status-bar", () => ({
  PromptShieldStatusBar: mocks.PromptShieldStatusBar,
}));

vi.mock("path", () => ({
  join: vi.fn(),
}));

describe("VSCode Extension", () => {
  const context = {
    subscriptions: [],
    asAbsolutePath: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.resetModules(); // Reset modules to ensure fresh import
    vi.clearAllMocks();

    // Setup doMock
    vi.doMock("vscode-languageclient/node", () => ({
      LanguageClient: class {
        start = mocks.LanguageClient.start;
        stop = mocks.LanguageClient.stop;
      },
      TransportKind: { ipc: 1 },
    }));
  });

  it("should activate extension", async () => {
    const { activate } = await import("./extension");
    activate(context);

    expect(mocks.LanguageClient.start).toHaveBeenCalled();
    expect(mocks.DecorationManager.activate).toHaveBeenCalled();
    expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(4);
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
    const handler = calls.find(
      (c) => c[0] === "promptshield.scanWorkspace",
    )?.[1];

    if (handler) {
      handler();
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "promptshield.scanWorkspace",
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
    // @ts-expect-error -- ok for test
    mocks.DecorationManager.getAllThreats.mockReturnValue([threat]);

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
});
