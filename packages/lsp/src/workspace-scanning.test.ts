/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleWorkspaceFix, handleWorkspaceScan } from "./workspace-scanning";

// Mocks
const mockConnection = {
  sendDiagnostics: vi.fn(),
  sendNotification: vi.fn(),
  window: {
    showInformationMessage: vi.fn(),
    createWorkDoneProgress: vi.fn().mockResolvedValue({
      begin: vi.fn(),
      report: vi.fn(),
      done: vi.fn(),
      token: { isCancellationRequested: false },
    }),
  },
};

vi.mock("node:url", () => ({
  fileURLToPath: vi.fn((_uri) => {
    return "/workspace"; // Simplified return for test
  }),
  pathToFileURL: vi.fn((_path) => {
    return { toString: () => "file:///workspace/file.txt" };
  }),
}));

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn(),
}));

vi.mock("@promptshield/workspace", () => ({
  scanWorkspace: vi.fn(),
  scanAndFixWorkspace: vi.fn(),
  generateWorkspaceReport: vi.fn(),
  PROMPTSHIELD_ARTIFACTS_DIR: ".promptshield",
}));

import {
  scanAndFixWorkspace as scanAndFixWorkspaceCore,
  scanWorkspace as scanWorkspaceCore,
} from "@promptshield/workspace";

describe("Workspace Scanning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should scan files returned by scanWorkspaceCore", async () => {
    // Generate an async iterator for the mock
    async function* mockScan() {
      yield {
        progress: 50,
        name: "file1.txt",
        path: "file1.txt",
        result: { threats: [] },
      };
      yield {
        progress: 100,
        name: "subdir/file2.js",
        path: "subdir/file2.js",
        result: { threats: [] },
      };
    }
    vi.mocked(scanWorkspaceCore).mockReturnValue(mockScan() as any);

    await handleWorkspaceScan(mockConnection as any, "file:///workspace", {
      force: false,
      noIgnore: false,
    } as any);

    expect(scanWorkspaceCore).toHaveBeenCalledWith(
      [],
      "/workspace",
      expect.any(Object),
    );
    expect(mockConnection.window.showInformationMessage).toHaveBeenCalled();
  });

  it("should warn if threats are found", async () => {
    async function* mockScan() {
      yield {
        progress: 100,
        name: "file.txt",
        path: "file.txt",
        result: {
          threats: [
            {
              category: "TEST",
              severity: "HIGH",
              message: "test",
              offendingText: "test",
              loc: { line: 1, column: 1, index: 0 },
            },
          ],
        },
      };
    }
    vi.mocked(scanWorkspaceCore).mockReturnValue(mockScan() as any);

    await handleWorkspaceScan(mockConnection as any, "file:///workspace", {
      force: false,
      noIgnore: false,
    } as any);

    expect(mockConnection.sendDiagnostics).toHaveBeenCalled();
  });

  it("should send diagnostics for unused ignores", async () => {
    async function* mockScan() {
      yield {
        progress: 100,
        name: "file.txt",
        path: "file.txt",
        result: {
          threats: [],
          unusedIgnores: [
            { definedAt: { start: { line: 1 }, end: { line: 1 } } },
          ],
        },
      };
    }
    vi.mocked(scanWorkspaceCore).mockReturnValue(mockScan() as any);

    await handleWorkspaceScan(mockConnection as any, "file:///workspace", {
      force: false,
    } as any);

    expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            message: "Unused promptshield-ignore directive",
            tags: [1], // DiagnosticTag.Unnecessary
          }),
        ]),
      }),
    );
  });
});

describe("Workspace Fixing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should silently return if no workspaceRoot", async () => {
    await handleWorkspaceFix(mockConnection as any, "", {} as any);
    expect(scanAndFixWorkspaceCore).not.toHaveBeenCalled();
  });

  it("should fix files returned by scanAndFixWorkspaceCore", async () => {
    // Generate an async iterator for the mock
    async function* mockScanAndFix() {
      yield {
        progress: 50,
        name: "file1.txt",
        path: "file1.txt",
        result: { threats: [], fixed: [] },
      };
      yield {
        progress: 100,
        name: "subdir/file2.js",
        path: "subdir/file2.js",
        result: { threats: [{ severity: "HIGH" }], fixed: [{}] },
      };
    }
    vi.mocked(scanAndFixWorkspaceCore).mockReturnValue(mockScanAndFix() as any);

    await handleWorkspaceFix(mockConnection as any, "file:///workspace", {
      force: true,
      minSeverity: "LOW",
    } as any);

    expect(scanAndFixWorkspaceCore).toHaveBeenCalledWith(
      [],
      "/workspace",
      expect.objectContaining({
        forceFullScan: true,
        minSeverity: "LOW",
        write: true,
      }),
    );
    expect(mockConnection.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("Fixed 1 of 1 threats in 2 files"),
    );
  });

  it("should support cancellation", async () => {
    const mockConnectionWithCancel = {
      ...mockConnection,
      window: {
        ...mockConnection.window,
        createWorkDoneProgress: vi.fn().mockResolvedValue({
          begin: vi.fn(),
          report: vi.fn(),
          done: vi.fn(),
          token: { isCancellationRequested: true },
        }),
      },
    };

    async function* mockScanAndFix() {
      yield {
        progress: 50,
        name: "file1.txt",
        path: "file1.txt",
        result: { threats: [], fixed: [] },
      };
      yield {
        progress: 100,
        name: "file2.txt",
        path: "file2.txt",
        result: { threats: [], fixed: [] },
      };
    }
    vi.mocked(scanAndFixWorkspaceCore).mockReturnValue(mockScanAndFix() as any);

    await handleWorkspaceFix(
      mockConnectionWithCancel as any,
      "file:///workspace",
      { force: false } as any,
    );

    // Because it's canceled, we shouldn't continue accumulating scannedFiles for the message
    expect(
      mockConnectionWithCancel.window.showInformationMessage,
    ).toHaveBeenCalledWith(
      expect.stringContaining("Fixed 0 of 0 threats in 0 files"),
    );
  });
});
