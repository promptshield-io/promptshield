/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  let threatCallback: (count: number) => void;

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
    if (threatCallback) threatCallback(0);

    expect(mockStatusBarItem.text).toContain("$(shield)");
    expect(mockStatusBarItem.text).toContain("PromptShield"); // Standard text
    expect(mockStatusBarItem.backgroundColor).toBeUndefined();
  });

  it("should show threat count and error color when threats detected", () => {
    if (threatCallback) threatCallback(5);

    expect(mockStatusBarItem.text).toContain("5");
    expect(mockStatusBarItem.backgroundColor).toBeDefined();
  });

  it("should clear loading state when threats update", () => {
    statusBar.setLoading(true);
    expect(mockStatusBarItem.text).toContain("$(sync~spin)");

    if (threatCallback) threatCallback(2);
    statusBar.setLoading(false);

    expect(mockStatusBarItem.text).not.toContain("$(sync~spin)");
    expect(mockStatusBarItem.text).toContain("2");
  });
});
