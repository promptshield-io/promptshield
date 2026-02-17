/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scanWorkspace } from "./workspace-scanning";

// Mocks
const mockConnection = {
  sendDiagnostics: vi.fn(),
  window: {
    showInformationMessage: vi.fn(),
  },
};

const mockDocuments = {
  get: vi.fn(),
};

vi.mock("node:url", () => ({
  fileURLToPath: vi.fn((_uri) => {
    return "/workspace"; // Simplified return for test
  }),
}));

vi.mock("node:fs");
vi.mock("@promptshield/core", () => ({
  scan: vi.fn(() => ({ threats: [] })),
}));
vi.mock("@promptshield/ignore", () => ({
  filterThreats: vi.fn((_text, threats) => ({ threats })),
}));

import { scan } from "@promptshield/core";

describe("Workspace Scanning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should scan files in workspace recursively", async () => {
    // Mock file system
    // Structure:
    // /workspace
    //   - file1.txt
    //   - subdir
    //     - file2.js
    //   - .git (ignored)

    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const d = dir.toString().replace(/\\/g, "/");
      if (d.endsWith("/workspace"))
        return ["file1.txt", "subdir", ".git"] as any;
      if (d.endsWith("/workspace/subdir")) return ["file2.js"] as any;
      return [] as any;
    });

    vi.mocked(fs.statSync).mockImplementation((path) => {
      const p = path.toString().replace(/\\/g, "/");
      return {
        isDirectory: () => !p.endsWith(".txt") && !p.endsWith(".js"),
      } as any;
    });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("content");

    await scanWorkspace(mockConnection as any, mockDocuments as any, [
      "file:///workspace",
    ]);

    expect(fs.readdirSync).toHaveBeenCalledTimes(2); // root and subdir
    expect(scan).toHaveBeenCalledTimes(2); // file1 and file2
    expect(mockConnection.window.showInformationMessage).toHaveBeenCalled();
  });

  it("should warn if threats are found", async () => {
    vi.mocked(fs.readdirSync).mockReturnValue(["file.txt"] as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
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

    await scanWorkspace(mockConnection as any, mockDocuments as any, [
      "file:///workspace",
    ]);

    expect(mockConnection.sendDiagnostics).toHaveBeenCalled();
  });
});
