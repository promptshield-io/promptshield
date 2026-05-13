/** biome-ignore-all lint/suspicious/noExplicitAny: Use of any is ok for test files */

import { readFile } from "node:fs/promises";
import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import {
  generateWorkspaceReport,
  isBinary,
  resolveFiles,
  runWorkspaceScan,
  sanitizeWorkspace,
} from "@promptshield/workspace";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type PromptshieldCliOptions, runPromptShield } from "./main";

// Mock dependencies
vi.mock("node:fs/promises");
vi.mock("@promptshield/core");
vi.mock("@promptshield/ignore", () => ({
  filterThreats: vi.fn(),
  createIgnoreChecker: vi.fn(() => vi.fn(() => false)),
}));
vi.mock("@promptshield/sanitizer");
vi.mock("@promptshield/workspace", () => ({
  isBinary: vi.fn(),
  resolveFiles: vi.fn(),
  sanitizeWorkspace: vi.fn(),
  runWorkspaceScan: vi.fn(),
  generateWorkspaceReport: vi.fn(),
  atomicWrite: vi.fn().mockResolvedValue(undefined),
  PROMPTSHIELD_ARTIFACTS_DIR: ".promptshield",
  PROMPTSHIELD_REPORT_FILE: "workspace-report.md",
}));
vi.mock("@turboforge/cli-kit", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
  deepMerge: (a: any, b: any) => ({ ...a, ...b }),
  findProjectRoot: vi.fn(() => "/root"),
}));

describe("runPromptShield", () => {
  const mockReadFile = readFile as any;
  const mockScan = scan as any;
  const mockFilterThreats = filterThreats as any;

  const mockIsBinary = isBinary as any;
  const mockResolveFiles = resolveFiles as any;
  const mockSanitizeWorkspace = sanitizeWorkspace as any;
  const mockRunWorkspaceScan = runWorkspaceScan as any;
  const mockGenerateWorkspaceReport = generateWorkspaceReport as any;

  const OPTIONS: PromptshieldCliOptions = {
    patterns: ["test.ts"],
    command: "scan",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockReadFile.mockResolvedValue("file content");
    mockResolveFiles.mockResolvedValue(["test.ts"]);
    mockIsBinary.mockResolvedValue(false);
    process.exitCode = 0;

    // Default ignore behavior: pass through
    mockFilterThreats.mockImplementation((_: any, threats: any) => ({
      threats,
      unusedIgnores: [],
      ignoredThreats: [],
      ignoredBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    }));

    // Default generator mocks
    async function* emptyGenerator() {}
    mockSanitizeWorkspace.mockImplementation(emptyGenerator);
    mockRunWorkspaceScan.mockImplementation(emptyGenerator);
  });

  afterEach(() => {
    process.exitCode = 0;
  });

  describe("Check Mode", () => {
    it("should exit with code 1 if check mode is enabled and threats found", async () => {
      const threats = [
        {
          severity: "HIGH",
          category: "INVISIBLE",
          message: "Hidden char",
          range: {
            start: { line: 1, column: 1, index: 0 },
            end: { line: 1, column: 10, index: 9 },
          },
        },
      ];
      mockScan.mockReturnValue({ threats });
      mockFilterThreats.mockReturnValue({
        threats,
        unusedIgnores: [],
        ignoredThreats: [],
        ignoredBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      });

      await runPromptShield({ ...OPTIONS, check: true });

      expect(process.exitCode).toBe(1);
      expect(mockReadFile).toHaveBeenCalledWith("test.ts", "utf-8");
      expect(mockRunWorkspaceScan).not.toHaveBeenCalled(); // Check mode exits early manually
    });

    it("should not exit with code 1 if check mode finds no threats", async () => {
      mockScan.mockReturnValue({ threats: [] });
      await runPromptShield({ ...OPTIONS, check: true });
      expect(process.exitCode).toBe(0);
    });

    it("should skip binary files in check mode", async () => {
      mockIsBinary.mockResolvedValue(true);
      mockScan.mockReturnValue({ threats: [] });
      await runPromptShield({ ...OPTIONS, check: true });
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(0);
    });
  });

  describe("Scan Mode", () => {
    it("should run runWorkspaceScan and report no threats", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: { threats: [], unusedIgnores: [], ignoredBySeverity: {} },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);

      await runPromptShield(OPTIONS);

      expect(mockRunWorkspaceScan).toHaveBeenCalledWith(
        ["test.ts"],
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should run runWorkspaceScan and report threats", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [
              {
                severity: "HIGH",
                ruleId: "PSI001",
                message: "Threat",
                range: {
                  start: { line: 1, column: 1, index: 0 },
                  end: { line: 1, column: 1, index: 0 },
                },
              },
            ],
            unusedIgnores: [],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      await runPromptShield(OPTIONS);
      expect(mockRunWorkspaceScan).toHaveBeenCalled();
    });

    it("should run runWorkspaceScan and report unused ignores", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [],
            unusedIgnores: [{ definedAt: 5 }],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      await runPromptShield(OPTIONS);
      expect(mockRunWorkspaceScan).toHaveBeenCalled();
    });

    it("should output JSON if enabled", async () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [{ severity: "HIGH" }],
            unusedIgnores: [],
            fixed: [],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);

      await runPromptShield({ ...OPTIONS, json: true });

      expect(spy).toHaveBeenCalled();
      const outputStr = spy.mock.calls.find((call) =>
        String(call[0]).includes("test.ts"),
      )?.[0];
      const output = JSON.parse(outputStr);
      expect(output["test.ts"].threats).toBeDefined();
      spy.mockRestore();
    });

    it("should generate report if requested and threats found", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [
              {
                severity: "HIGH",
                ruleId: "PSI001",
                message: "Threat",
                range: {
                  start: { line: 1, column: 1, index: 0 },
                  end: { line: 1, column: 1, index: 0 },
                },
              },
            ],
            unusedIgnores: [],
            fixed: [],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      mockGenerateWorkspaceReport.mockResolvedValue();

      await runPromptShield({ ...OPTIONS, report: true });

      expect(mockGenerateWorkspaceReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.objectContaining({ uri: "test.ts" })]),
        1,
        expect.any(String),
        undefined,
      );
    });

    it("should generate report with baseUrl when provided", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [
              {
                severity: "HIGH",
                ruleId: "PSI001",
                message: "Threat",
                range: {
                  start: { line: 1, column: 1, index: 0 },
                  end: { line: 1, column: 1, index: 0 },
                },
              },
            ],
            unusedIgnores: [],
            fixed: [],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      mockGenerateWorkspaceReport.mockResolvedValue();

      await runPromptShield({
        ...OPTIONS,
        report: true,
        baseUrl: "https://github.com/owner/repo/blob/abc",
      });

      expect(mockGenerateWorkspaceReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        1,
        expect.any(String),
        "https://github.com/owner/repo/blob/abc",
      );
    });

    it("should log ignored threats by severity", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [
              {
                severity: "HIGH",
                ruleId: "PSI001",
                message: "Threat",
                range: {
                  start: { line: 1, column: 1, index: 0 },
                  end: { line: 1, column: 1, index: 0 },
                },
              },
            ],
            unusedIgnores: [],
            fixed: [],
            ignoredBySeverity: { CRITICAL: 0, HIGH: 2, MEDIUM: 1, LOW: 0 },
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      await runPromptShield(OPTIONS);
      expect(mockRunWorkspaceScan).toHaveBeenCalled();
    });
  });

  describe("Sanitize Mode", () => {
    it("should call sanitizeWorkspace", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          changed: true,
          sanitized: "cleaned",
          progress: 100,
        };
      }
      mockSanitizeWorkspace.mockImplementation(gen);

      await runPromptShield({ ...OPTIONS, command: "sanitize" });

      expect(mockSanitizeWorkspace).toHaveBeenCalledWith(
        ["test.ts"],
        expect.any(String),
        expect.objectContaining({ strict: false, write: false }),
      );
    });

    it("should log unchanged file in dry-run sanitize", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          changed: false,
          sanitized: "same content",
          progress: 100,
        };
      }
      mockSanitizeWorkspace.mockImplementation(gen);
      await runPromptShield({ ...OPTIONS, command: "sanitize" });
      expect(mockSanitizeWorkspace).toHaveBeenCalled();
    });

    it("should log progress when write is true and file unchanged", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          changed: false,
          sanitized: "same content",
          progress: 100,
        };
      }
      mockSanitizeWorkspace.mockImplementation(gen);
      await runPromptShield({ ...OPTIONS, command: "sanitize", write: true });
      expect(mockSanitizeWorkspace).toHaveBeenCalled();
    });

    it("should use strict sanitization if requested", async () => {
      await runPromptShield({ ...OPTIONS, command: "sanitize", strict: true });

      expect(mockSanitizeWorkspace).toHaveBeenCalledWith(
        ["test.ts"],
        expect.any(String),
        expect.objectContaining({ strict: true }),
      );
    });

    it("should apply --write to sanitizeWorkspace", async () => {
      await runPromptShield({ ...OPTIONS, command: "sanitize", write: true });

      expect(mockSanitizeWorkspace).toHaveBeenCalledWith(
        ["test.ts"],
        expect.any(String),
        expect.objectContaining({ write: true }),
      );
    });
  });

  describe("Fix Mode", () => {
    it("should run runWorkspaceScan", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [
              {
                severity: "HIGH",
                ruleId: "PSI001",
                message: "Threat",
                range: {
                  start: { line: 1, column: 1, index: 0 },
                  end: { line: 1, column: 1, index: 0 },
                },
              },
            ],
            unusedIgnores: [],
            fixed: [
              {
                ruleId: "PSU001",
                range: {
                  start: { line: 1, column: 1, index: 0 },
                  end: { line: 1, column: 1, index: 0 },
                },
              },
            ],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);

      await runPromptShield({ ...OPTIONS, command: "fix" });

      expect(mockRunWorkspaceScan).toHaveBeenCalled();
    });

    it("should show dry-run fix preview when write is false and fixes exist", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [],
            unusedIgnores: [],
            fixed: [
              {
                ruleId: "PSI001",
                range: {
                  start: { line: 1, column: 1, index: 0 },
                  end: { line: 1, column: 1, index: 0 },
                },
              },
            ],
            text: "fixed content",
            skipped: [],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      await runPromptShield({ ...OPTIONS, command: "fix", write: false });
      expect(mockRunWorkspaceScan).toHaveBeenCalled();
    });

    it("should show dry-run no-changes message when write is false and no fixes", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [],
            unusedIgnores: [],
            fixed: [],
            skipped: [],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      await runPromptShield({ ...OPTIONS, command: "fix", write: false });
      expect(mockRunWorkspaceScan).toHaveBeenCalled();
    });

    it("should warn about skipped threats in dry-run fix", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [],
            unusedIgnores: [],
            fixed: [],
            skipped: [
              {
                ruleId: "PSI001",
                range: {
                  start: { line: 1, column: 1, index: 0 },
                  end: { line: 1, column: 1, index: 0 },
                },
              },
            ],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      await runPromptShield({ ...OPTIONS, command: "fix", write: false });
      expect(mockRunWorkspaceScan).toHaveBeenCalled();
    });

    it("should write JSON report when report and json are both enabled", async () => {
      async function* gen() {
        yield {
          path: "test.ts",
          result: {
            threats: [{ severity: "HIGH" }],
            unusedIgnores: [],
            fixed: [],
            ignoredBySeverity: {},
          },
          progress: 100,
        };
      }
      mockRunWorkspaceScan.mockImplementation(gen);
      mockGenerateWorkspaceReport.mockResolvedValue();

      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      await runPromptShield({ ...OPTIONS, report: true, json: true });
      spy.mockRestore();

      expect(mockGenerateWorkspaceReport).toHaveBeenCalled();
    });
  });
});
