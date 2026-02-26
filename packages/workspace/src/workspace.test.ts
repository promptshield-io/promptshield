/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveFiles } from "./resolve-files";
import {
  generateWorkspaceReport,
  sanitizeWorkspace,
  scanAndFixWorkspace,
  scanFile,
  scanWorkspace,
} from "./workspace";

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
    vi.mocked(fg).mockImplementation(async (patterns: any) => {
      if (
        patterns[0] === "**/*.promptshieldignore" ||
        patterns[0] === "**/*.psignore" ||
        patterns[0] === "**/*.gitignore"
      )
        return [];
      return ["/test/workspace/file.ts"];
    });
    mockIgnoredFiles({});

    const files = await resolveFiles([], mockRoot);

    expect(fg).toHaveBeenCalledWith(
      ["**/*"],
      expect.objectContaining({ cwd: mockRoot }),
    );
    expect(files).toEqual(["/test/workspace/file.ts"]);
  });

  it("should respect .gitignore rules", async () => {
    vi.mocked(fg).mockImplementation(async (patterns: any) => {
      if (patterns.some((p: string) => p.includes(".gitignore")))
        return ["/test/workspace/.gitignore"];
      return ["/test/workspace/file.ts", "/test/workspace/ignored.ts"];
    });
    mockIgnoredFiles({ ".gitignore": "ignored.ts" });

    const files = await resolveFiles([], mockRoot);

    expect(files).toEqual(["/test/workspace/file.ts"]);
  });

  it("should resolve files using negation and root patterns", async () => {
    vi.mocked(fg).mockImplementation(async (patterns: any) => {
      if (patterns.some((p: string) => p.includes(".gitignore")))
        return ["/test/workspace/folder/.gitignore"];
      // Included /test/workspace/folder/ignored.ts but NOT the ignored !negated.ts
      return [
        "/test/workspace/folder/included.ts",
        "/test/workspace/folder/ignored.ts",
        "/test/workspace/folder/negated.ts",
      ];
    });

    mockIgnoredFiles({
      ".gitignore": `
/ignored.ts
!/negated.ts
`,
    });

    const files = await resolveFiles([], mockRoot);

    expect(files).toEqual([
      "/test/workspace/folder/included.ts",
      "/test/workspace/folder/negated.ts",
    ]);
  });

  it("should ignore .promptshield-cache.json and promptshield-report.md by default", async () => {
    vi.mocked(fg).mockImplementation(async (patterns: any) => {
      if (patterns[0]?.includes("ignore")) return []; // no ignore files
      return [
        "/test/workspace/file.ts",
        "/test/workspace/.promptshield/workspace-report.md",
      ];
    });
    mockIgnoredFiles({});

    const files = await resolveFiles([], mockRoot);

    expect(files).toEqual(["/test/workspace/file.ts"]);
  });

  it("should respect .promptshieldignore rules", async () => {
    vi.mocked(fg).mockImplementation(async (patterns: any) => {
      if (patterns.some((p: string) => p.includes(".promptshieldignore")))
        return ["/test/workspace/.promptshieldignore"];
      return ["/test/workspace/file.ts", "/test/workspace/secret.txt"];
    });
    mockIgnoredFiles({ ".promptshieldignore": "secret.txt" });

    const files = await resolveFiles([], mockRoot);

    expect(files).toEqual(["/test/workspace/file.ts"]);
  });
});

import * as core from "@promptshield/core";
import * as ignore from "@promptshield/ignore";
import { applyFixes, sanitize, sanitizeStrict } from "@promptshield/sanitizer";
import type { CacheManager } from "./cache";
import * as utils from "./utils";

vi.mock("@promptshield/core", () => ({
  scan: vi.fn(),
  SEVERITY_MAP: { LOW: 3, MEDIUM: 2, HIGH: 1, CRITICAL: 0 },
}));

vi.mock("@promptshield/ignore", () => ({
  filterThreats: vi.fn(),
}));

vi.mock("./utils", () => ({
  atomicWrite: vi.fn(),
  createLimiter: vi.fn(() => (task: any) => task()),
  isBinary: vi.fn(),
}));

vi.mock("@promptshield/sanitizer", () => ({
  applyFixes: vi.fn(),
  sanitize: vi.fn(),
  sanitizeStrict: vi.fn(),
}));

describe("workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scanFile", () => {
    it("should skip binary files", async () => {
      vi.mocked(utils.isBinary).mockResolvedValue(true);
      const { result } = await scanFile(
        "/test/workspace/binary.bin",
        "/test/workspace",
        {
          cache: null,
          baselineMinSeverity: "LOW",
          minSeverity: "LOW",
          noInlineIgnore: false,
        },
      );
      expect(result.threats).toEqual([]);
    });

    it("should scan text files and apply filterThreats", async () => {
      vi.mocked(utils.isBinary).mockResolvedValue(false);
      vi.mocked(readFile).mockResolvedValue("test content");
      vi.mocked(core.scan).mockReturnValue({
        threats: [{ severity: "HIGH" } as any],
      } as any);
      vi.mocked(ignore.filterThreats).mockReturnValue({
        threats: [{ severity: "HIGH" } as any],
        ignoredThreats: [],
        unusedIgnores: [],
        ignoredBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      } as any);

      const { result } = await scanFile(
        "/test/workspace/file.ts",
        "/test/workspace",
        {
          cache: null,
          baselineMinSeverity: "LOW",
          minSeverity: "LOW",
          noInlineIgnore: false,
        },
      );
      expect(result.threats.length).toBe(1);
    });

    it("should fetch from cache if available", async () => {
      vi.mocked(utils.isBinary).mockResolvedValue(false);
      const mockCache = {
        get: vi.fn().mockResolvedValue({
          threats: [{ severity: "LOW", loc: { index: 0 } }],
          ignoredThreats: [],
          unusedIgnores: [],
          ignoredBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        }),
        set: vi.fn(),
      };

      const { result } = await scanFile(
        "/test/workspace/file.ts",
        "/test/workspace",
        {
          cache: mockCache as unknown as CacheManager,
          baselineMinSeverity: "LOW",
          minSeverity: "LOW",
          noInlineIgnore: false,
        },
      );
      expect(result.threats.length).toBe(1);
      expect(core.scan).not.toHaveBeenCalled();
    });

    it("should filter severity properly from cache", async () => {
      vi.mocked(utils.isBinary).mockResolvedValue(false);
      const mockCache = {
        get: vi.fn().mockResolvedValue({
          threats: [
            { severity: "LOW", loc: { index: 0 } },
            { severity: "CRITICAL", loc: { index: 1 } },
          ],
          ignoredThreats: [],
          unusedIgnores: [],
          ignoredBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        }),
        set: vi.fn(),
      };

      const { result } = await scanFile(
        "/test/workspace/file.ts",
        "/test/workspace",
        {
          cache: mockCache as unknown as CacheManager,
          baselineMinSeverity: "LOW",
          minSeverity: "HIGH",
          noInlineIgnore: false,
        },
      );
      expect(result.threats.length).toBe(1); // Only Critical remains
      expect(result.threats[0].severity).toBe("CRITICAL");
    });

    it("should return empty result and use emptyResult if noInlineIgnore is true", async () => {
      vi.mocked(utils.isBinary).mockResolvedValue(false);
      vi.mocked(readFile).mockResolvedValue("test content");
      vi.mocked(core.scan).mockReturnValue({
        threats: [{ severity: "HIGH" } as any],
      } as any);
      vi.mocked(ignore.filterThreats).mockReturnValue({
        threats: [{ severity: "HIGH" } as any],
        ignoredThreats: [],
        unusedIgnores: [],
        ignoredBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      } as any);

      const { result } = await scanFile(
        "/test/workspace/file.ts",
        "/test/workspace",
        {
          cache: null,
          baselineMinSeverity: "LOW",
          minSeverity: "LOW",
          noInlineIgnore: true,
        },
      );
      expect(result.ignoredBySeverity.LOW).toBe(0); // emptyResult used
    });

    it("should apply fixes when shouldApplyFixes is true", async () => {
      vi.mocked(utils.isBinary).mockResolvedValue(false);
      vi.mocked(readFile).mockResolvedValue("test content");
      vi.mocked(core.scan).mockReturnValue({
        threats: [{ severity: "HIGH", ruleId: "R1", loc: { index: 0 } } as any],
      } as any);
      vi.mocked(ignore.filterThreats).mockReturnValue({
        threats: [{ severity: "HIGH", ruleId: "R1", loc: { index: 0 } } as any],
        ignoredThreats: [],
        unusedIgnores: [],
        ignoredBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      } as any);

      vi.mocked(applyFixes).mockResolvedValue({
        text: "fixed content",
        fixed: [{ ruleId: "R1", loc: { index: 0 } } as any],
        skipped: [],
      });

      const mockCache = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
      };

      const { result } = await scanFile(
        "/test/workspace/file.ts",
        "/test/workspace",
        {
          cache: mockCache as any,
          baselineMinSeverity: "LOW",
          minSeverity: "LOW",
          noInlineIgnore: false,
          shouldApplyFixes: true,
          write: true,
        },
      );

      expect(utils.atomicWrite).toHaveBeenCalledWith(
        expect.stringContaining("file.ts"),
        "fixed content",
      );
      expect(mockCache.set).toHaveBeenCalled();
      expect(result.threats.length).toBe(1); // Result remains unmodified, only cache is updated
    });
  });

  describe("scanWorkspace", () => {
    it("should return empty if no files resolved", async () => {
      vi.mocked(fg).mockImplementation(async () => []);
      const events = [];
      for await (const event of scanWorkspace([], "/test/workspace")) {
        events.push(event);
      }
      expect(events.length).toBe(0);
    });

    it("should yield events for processed files", async () => {
      vi.mocked(fg).mockImplementation(async () => ["/test/workspace/file.ts"]);
      vi.mocked(utils.isBinary).mockResolvedValue(false);
      vi.mocked(readFile).mockResolvedValue("test content");
      vi.mocked(core.scan).mockReturnValue({ threats: [] } as any);
      vi.mocked(ignore.filterThreats).mockReturnValue({
        threats: [],
        ignoredThreats: [],
        unusedIgnores: [],
        ignoredBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      } as any);

      const events = [];
      for await (const event of scanWorkspace([], "/test/workspace", {
        cacheMode: "none",
      })) {
        events.push(event);
      }
      expect(events.length).toBe(1);
      expect(events[0].path).toBe("file.ts");
      expect(events[0].progress).toBe(100);
    });

    it("should handle error in scanFile and yield nothing for that file", async () => {
      vi.mocked(fg).mockImplementation(async () => ["/test/workspace/file.ts"]);
      vi.mocked(utils.isBinary).mockRejectedValue(
        new Error("Scan failure mock"),
      );
      const events = [];
      vi.spyOn(console, "error").mockImplementation(() => {});
      for await (const event of scanWorkspace([], "/test/workspace")) {
        events.push(event);
      }
      expect(events.length).toBe(0);
    });

    it("should execute cache.clear() when forceFullScan is true", async () => {
      vi.mocked(fg).mockImplementation(async () => ["/test/workspace/file.ts"]);
      vi.mocked(utils.isBinary).mockResolvedValue(true);
      const events = [];
      // Not strictly mocking cache, but ensuring the invocation doesn't crash
      // and it yields the file progress event successfully.
      for await (const event of scanWorkspace([], "/test/workspace", {
        forceFullScan: true,
      })) {
        events.push(event);
      }
      expect(events.length).toBe(1);
    });
    it("should handle progress correctly", async () => {
      vi.mocked(fg).mockImplementation(async () => [
        "/test/workspace/f1.ts",
        "/test/workspace/f2.ts",
      ]);
      vi.mocked(utils.isBinary).mockResolvedValue(true); // skip so it's fast
      const events = [];
      for await (const event of scanWorkspace(["*"], "/test/workspace", {
        concurrency: 1,
      })) {
        events.push(event);
      }
      expect(events[0].progress).toBe(50);
      expect(events[1].progress).toBe(100);
    });
  });

  describe("scanAndFixWorkspace", () => {
    it("should automatically set shouldApplyFixes to true", async () => {
      vi.mocked(fg).mockImplementation(async () => ["/test/workspace/test.ts"]);
      vi.mocked(utils.isBinary).mockResolvedValue(false);
      vi.mocked(readFile).mockResolvedValue("test content");
      vi.mocked(applyFixes).mockResolvedValue({
        text: "fixed content",
        fixed: [{ ruleId: "R1", loc: { index: 0 } } as any],
        skipped: [],
      });
      vi.mocked(core.scan).mockReturnValue({
        threats: [{ severity: "HIGH", ruleId: "R1", loc: { index: 0 } } as any],
      } as any);
      vi.mocked(ignore.filterThreats).mockReturnValue({
        threats: [{ severity: "HIGH", ruleId: "R1", loc: { index: 0 } } as any],
        ignoredThreats: [],
        unusedIgnores: [],
        ignoredBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      } as any);

      const events = [];
      for await (const event of scanAndFixWorkspace(["*"], "/test", {
        write: true,
      })) {
        events.push(event);
      }

      expect(events.length).toBe(1);
      expect(events[0].result.fixed?.length).toBe(1);
      expect(utils.atomicWrite).toHaveBeenCalled();
    });
  });

  describe("sanitizeWorkspace", () => {
    it("should silently return if no files resolved", async () => {
      vi.mocked(fg).mockImplementation(async () => []);
      const events = [];
      for await (const event of sanitizeWorkspace(["*"], "/test")) {
        events.push(event);
      }
      expect(events.length).toBe(0);
    });

    it("should process and optionally write files", async () => {
      vi.mocked(fg).mockImplementation(async () => [
        "/test/test.ts",
        "/test/test2.ts",
      ]);
      vi.mocked(readFile).mockImplementation(async (f) =>
        (f as string).includes("test2") ? "clean" : "dirty",
      );

      const mockSanitize = vi.fn((c) => (c === "dirty" ? "cleaned" : c));
      vi.mocked(sanitize).mockImplementation(mockSanitize);

      const events = [];
      for await (const event of sanitizeWorkspace(["*"], "/test", {
        write: true,
        concurrency: 1,
      })) {
        events.push(event);
      }

      expect(events.length).toBe(2);
      expect(events[0].changed).toBe(true);
      expect(events[0].sanitized).toBe("cleaned");
      expect(utils.atomicWrite).toHaveBeenCalledWith(
        expect.stringContaining("test.ts"),
        "cleaned",
      );

      expect(events[1].changed).toBe(false);
      expect(utils.atomicWrite).toHaveBeenCalledTimes(1);
    });

    it("should use strict sanitizer when specified", async () => {
      vi.mocked(fg).mockImplementation(async () => ["/test/test.ts"]);
      vi.mocked(readFile).mockResolvedValue("dirty");

      const mockSanitizeStrict = vi.fn().mockReturnValue("strictly-cleaned");
      vi.mocked(sanitizeStrict).mockImplementation(mockSanitizeStrict);

      const events = [];
      for await (const event of sanitizeWorkspace(["*"], "/test", {
        strict: true,
      })) {
        events.push(event);
      }

      expect(mockSanitizeStrict).toHaveBeenCalledWith("dirty");
      expect(events[0].sanitized).toBe("strictly-cleaned");
    });
  });

  describe("generateWorkspaceReport", () => {
    it("should silently return if no threats", async () => {
      await generateWorkspaceReport("/test/workspace", [], 0);
      expect(utils.atomicWrite).not.toHaveBeenCalled();
    });

    it("should format md report for threats with readable labels and various severities", async () => {
      await generateWorkspaceReport(
        "/test/workspace",
        [
          {
            uri: "file.ts",
            threats: [
              {
                category: "TEST",
                severity: "CRITICAL",
                message: "crit msg",
                loc: { line: 1 },
                readableLabel: "RL",
              } as any,
              {
                category: "TEST",
                severity: "HIGH",
                message: "high msg",
                loc: { line: 1 },
              } as any,
              {
                category: "TEST",
                severity: "MEDIUM",
                message: "med msg",
                loc: { line: 2 },
              } as any,
              {
                category: "TEST",
                severity: "LOW",
                message: "low msg",
                loc: { line: 3 },
              } as any,
            ],
          },
        ],
        4,
      );
      expect(utils.atomicWrite).toHaveBeenCalledWith(
        expect.stringContaining("workspace-report.md"),
        expect.stringContaining("crit msg"),
      );
      expect(utils.atomicWrite).toHaveBeenCalledWith(
        expect.stringContaining("workspace-report.md"),
        expect.stringContaining("RL"),
      );
    });
  });
});
