/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { PromptShieldStatusBar } from "./status-bar";

// Mock vscode
const mockStatusBarItem = {
  command: "",
  text: "",
  tooltip: "",
  backgroundColor: undefined,
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
};

vi.mock("vscode", () => ({
  window: {
    createStatusBarItem: vi.fn(() => mockStatusBarItem),
  },
  languages: {
    getDiagnostics: vi.fn(() => []),
    onDidChangeDiagnostics: vi.fn(() => ({ dispose: vi.fn() })),
  },
  StatusBarAlignment: { Right: 1 },
  ThemeColor: class {
    constructor(public id: string) {}
  },
}));

describe("PromptShieldStatusBar", () => {
  let statusBar: PromptShieldStatusBar;
  let mockDecorationManager: any;
  let threatCallback: (e: { count: number }) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStatusBarItem.text = "";
    mockStatusBarItem.tooltip = "";
    mockStatusBarItem.backgroundColor = undefined;

    mockDecorationManager = {
      onThreatsChanged: vi.fn((cb) => {
        threatCallback = cb;
        return { dispose: vi.fn() };
      }),
    };

    statusBar = new PromptShieldStatusBar(mockDecorationManager);
  });

  it("should initialize and show status bar", () => {
    expect(mockStatusBarItem.show).toHaveBeenCalled();
    expect(mockStatusBarItem.command).toBe("promptshield.showMenu");
  });

  it("should show spinning icon when loading", () => {
    statusBar.setLoading(true);
    expect(mockStatusBarItem.text).toContain("$(sync~spin)");
    expect(mockStatusBarItem.tooltip).toContain("Scanning");
  });

  it("should show check shield when no threats", () => {
    // Trigger update via callback
    if (threatCallback) threatCallback({ count: 0 });

    expect(mockStatusBarItem.text).toContain("$(shield)");
    expect(mockStatusBarItem.text).toContain("PromptShield"); // Standard text
    expect(mockStatusBarItem.backgroundColor).toBeUndefined();
  });

  it("should show threat count and error color when threats detected", () => {
    if (threatCallback) threatCallback({ count: 5 });

    expect(mockStatusBarItem.text).toContain("5");
    expect(mockStatusBarItem.backgroundColor).toBeDefined();
  });

  it("should clear loading state when threats update", () => {
    statusBar.setLoading(true);
    expect(mockStatusBarItem.text).toContain("$(sync~spin)");

    if (threatCallback) threatCallback({ count: 2 });
    statusBar.setLoading(false);

    expect(mockStatusBarItem.text).not.toContain("$(sync~spin)");
    expect(mockStatusBarItem.text).toContain("2");
  });

  it("should update workspace threats using setWorkspaceThreatCount", () => {
    if (threatCallback) threatCallback({ count: 1 }); // 1 file threat
    statusBar.setWorkspaceThreatCount(5);

    expect(mockStatusBarItem.text).toContain("1 | 5");
    expect(mockStatusBarItem.tooltip).toContain(
      "1 threats in file, 5 in workspace",
    );
  });

  it("should track diagnostics updates and ignore artifact URIs", () => {
    const mockUriNormal = {
      toString: () => "file:///test.ts",
      fsPath: "C:\\test.ts",
    };
    const mockUriArtifact = {
      toString: () => "file:///.promptshield/workspace-report.md",
      fsPath: "C:\\.promptshield\\workspace-report.md",
    };

    // Simulate what would be returned exactly by vscode.languages.getDiagnostics()
    vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([
      [mockUriNormal, [{ source: "PromptShield" }, { source: "Other" }] as any],
      [mockUriArtifact, [{ source: "PromptShield" }] as any],
    ] as any);

    // Call private method directly for testing side-effects against getDiagnostics
    (statusBar as any).updateWorkspaceCount();

    // 1 promptshield threat on normal file, the artifact should be ignored
    expect((statusBar as any).workspaceThreatCount).toBe(1);
    expect(mockStatusBarItem.text).toContain("1");
  });

  it("should trigger workspace diagnostic update on event change", () => {
    let mockLangDispCb: any;
    vi.mocked(vscode.languages.onDidChangeDiagnostics).mockImplementation(
      (cb) => {
        mockLangDispCb = cb;
        return { dispose: vi.fn() } as any;
      },
    );

    const sb = new PromptShieldStatusBar(mockDecorationManager);
    expect(mockLangDispCb).toBeDefined();

    const spyUpdate = vi.spyOn(sb as any, "updateWorkspaceCount");
    mockLangDispCb({ uris: [] });
    expect(spyUpdate).toHaveBeenCalled();
  });

  it("should correctly dispose of listeners and status bar items", () => {
    const spyDisp = vi.spyOn(mockStatusBarItem, "dispose");

    const sb = new PromptShieldStatusBar(mockDecorationManager);
    sb.dispose();

    expect(spyDisp).toHaveBeenCalled();
  });
});
