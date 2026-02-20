/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scanWorkspace } from "./workspace-scanning";

// Mocks
const mockConnection = {
  sendDiagnostics: vi.fn(),
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

const mockDocuments = {
  get: vi.fn(),
};

vi.mock("node:url", () => ({
  fileURLToPath: vi.fn((_uri) => {
    return "/workspace"; // Simplified return for test
  }),
  pathToFileURL: vi.fn((_path) => {
    return { toString: () => "file:///workspace/file.txt" };
  }),
}));

vi.mock("node:fs");
vi.mock("@promptshield/core", () => ({
  scan: vi.fn(() => ({ threats: [] })),
}));
vi.mock("@promptshield/ignore", () => ({
  filterThreats: vi.fn((_text, threats) => ({ threats })),
}));
vi.mock("@promptshield/workspace", () => ({
  resolveFiles: vi.fn(),
}));

import { scan } from "@promptshield/core";
import { resolveFiles } from "@promptshield/workspace";

describe("Workspace Scanning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should scan files returned by resolveFiles", async () => {
    vi.mocked(resolveFiles).mockResolvedValue([
      "/workspace/file1.txt",
      "/workspace/subdir/file2.js",
    ]);

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("content");

    await scanWorkspace(
      mockConnection as any,
      mockDocuments as any,
      "file:///workspace",
    );

    expect(resolveFiles).toHaveBeenCalledWith([], "/workspace");
    expect(scan).toHaveBeenCalledTimes(2); // file1 and file2
    expect(mockConnection.window.showInformationMessage).toHaveBeenCalled();
  });

  it("should warn if threats are found", async () => {
    vi.mocked(resolveFiles).mockResolvedValue(["/workspace/file.txt"]);
    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(scan).mockReturnValue({
      threats: [
        {
          category: "TEST",
          severity: "HIGH",
          message: "test",
          offendingText: "test",
          loc: { line: 1, column: 1, index: 0 },
        },
      ],
    } as any);

    await scanWorkspace(
      mockConnection as any,
      mockDocuments as any,
      "file:///workspace",
    );

    expect(mockConnection.sendDiagnostics).toHaveBeenCalled();
  });
});
