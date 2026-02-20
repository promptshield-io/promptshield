/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveFiles } from "./workspace";

// Mock dependencies
vi.mock("node:fs/promises");
vi.mock("fast-glob", () => ({ default: vi.fn() }));

describe("resolveFiles", () => {
  const mockRoot = "/test/workspace";

  // Helpers to mock implementations
  const mockIgnoredFiles = (ignores: Record<string, string>) => {
    vi.mocked(readFile).mockImplementation(async (path) => {
      // Check if path ends with any of the keys
      for (const [key, content] of Object.entries(ignores)) {
        if (path.toString().endsWith(key)) {
          return content;
        }
      }
      throw new Error("File not found");
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve files using default patterns if none provided", async () => {
    vi.mocked(fg).mockResolvedValue(["/test/workspace/file.ts"]);
    mockIgnoredFiles({});

    const files = await resolveFiles([], mockRoot);

    expect(fg).toHaveBeenCalledWith(
      ["**/*.{ts,tsx,js,jsx,md,txt,json}"],
      expect.objectContaining({ cwd: mockRoot }),
    );
    expect(files).toEqual(["/test/workspace/file.ts"]);
  });

  it("should respect .gitignore rules", async () => {
    vi.mocked(fg).mockResolvedValue([
      "/test/workspace/file.ts",
      "/test/workspace/ignored.ts",
    ]);
    mockIgnoredFiles({ ".gitignore": "ignored.ts" });

    const files = await resolveFiles([], mockRoot);

    expect(files).toEqual(["/test/workspace/file.ts"]);
  });

  it("should ignore .promptshield-cache.json and promptshield.report.md by default", async () => {
    vi.mocked(fg).mockResolvedValue([
      "/test/workspace/file.ts",
      "/test/workspace/.promptshield-cache.json",
      "/test/workspace/promptshield.report.md",
    ]);
    mockIgnoredFiles({});

    const files = await resolveFiles([], mockRoot);

    expect(files).toEqual(["/test/workspace/file.ts"]);
  });

  it("should respect .promptshieldignore rules", async () => {
    vi.mocked(fg).mockResolvedValue([
      "/test/workspace/file.ts",
      "/test/workspace/secret.txt",
    ]);
    mockIgnoredFiles({ ".promptshieldignore": "secret.txt" });

    const files = await resolveFiles([], mockRoot);

    expect(files).toEqual(["/test/workspace/file.ts"]);
  });
});
