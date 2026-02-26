/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleWorkspaceScan } from "./workspace-scanning";

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
  generateWorkspaceReport: vi.fn(),
  PROMPTSHIELD_ARTIFACTS_DIR: ".promptshield",
}));

import { scanWorkspace as scanWorkspaceCore } from "@promptshield/workspace";

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
});
