/** biome-ignore-all lint/suspicious/noExplicitAny: Use of any is ok for test files */

import { readFile, writeFile } from "node:fs/promises";
import { findProjectRoot, resolveConfig } from "@turbo-forge/cli-kit";
import fg from "fast-glob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { main, parseArgs, showHelp } from "./cli";
import { DEFAULT_CONFIG, runPromptShield } from "./main";

// Mocks
vi.mock("node:fs/promises");
vi.mock("fast-glob");
vi.mock("@turbo-forge/cli-kit");
vi.mock("./main");

describe("cli.ts", () => {
  const mockReadFile = readFile as any;
  const mockWriteFile = writeFile as any;
  const mockFg = fg as any;
  const mockFindRoot = findProjectRoot as any;
  const mockResolveConfig = resolveConfig as any;
  const mockRun = runPromptShield as any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockFindRoot.mockReturnValue("/root");
    mockResolveConfig.mockResolvedValue({ ...DEFAULT_CONFIG, files: [] });
    mockFg.mockResolvedValue([]);
    mockReadFile.mockRejectedValue(new Error("ENOENT")); // Default no ignore files
  });

  describe("parseArgs", () => {
    it("should parse help flag", () => {
      expect(parseArgs(["--help"])).toEqual({ help: true });
      expect(parseArgs(["-h"])).toEqual({ help: true });
    });

    it("should parse init flag", () => {
      expect(parseArgs(["--init"])).toEqual({ init: true });
      expect(parseArgs(["-i"])).toEqual({ init: true });
    });

    it("should parse init with optional config file", () => {
      expect(parseArgs(["--init", "my-config.json"])).toEqual({
        init: true,
        config: "my-config.json",
      });
    });

    it("should parse config flag", () => {
      expect(parseArgs(["--config", "p.json"])).toEqual({ config: "p.json" });
      expect(parseArgs(["-c", "p.json"])).toEqual({ config: "p.json" });
    });

    it("should parse boolean flags", () => {
      expect(parseArgs(["--write"])).toEqual({ write: true });
      expect(parseArgs(["--json"])).toEqual({ json: true });
      expect(parseArgs(["--strict"])).toEqual({ strict: true });
      expect(parseArgs(["--check"])).toEqual({ check: true });
    });

    it("should parse commands", () => {
      expect(parseArgs(["scan"])).toEqual({ command: "scan" });
      expect(parseArgs(["fix"])).toEqual({ command: "fix" });
      expect(parseArgs(["sanitize"])).toEqual({ command: "sanitize" });
    });

    it("should parse positional files", () => {
      expect(parseArgs(["file1.txt", "file2.ts"])).toEqual({
        files: ["file1.txt", "file2.ts"],
      });
    });

    it("should mix flags and files", () => {
      expect(parseArgs(["scan", "--write", "file.ts"])).toEqual({
        command: "scan",
        write: true,
        files: ["file.ts"],
      });
    });

    it("should handle mixed flags", () => {
      const args = ["--check", "--json", "src", "scan"];
      const result = parseArgs(args);
      expect(result).toEqual({
        check: true,
        json: true,
        command: "scan",
        files: ["src"],
      });
    });
  });

  describe("showHelp", () => {
    it("should print help to console", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      showHelp();
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toContain("PromptShield CLI");
      spy.mockRestore();
    });
  });

  describe("main", () => {
    it("should show help if requested", async () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      await main(["--help"]);
      expect(spy).toHaveBeenCalled();
      expect(mockRun).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should handle init command", async () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      await main(["--init"]);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("promptshield.config.json"),
        expect.any(String),
      );
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Created config file"),
      );
      spy.mockRestore();
    });

    it("should handle init with custom config", async () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      await main(["--init", "custom.json"]);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("custom.json"),
        expect.any(String),
      );
      spy.mockRestore();
    });

    it("should resolve files and run promptshield", async () => {
      // Mock finding some files
      mockFg.mockResolvedValue(["/root/src/file.ts"]);
      // Mock ignore file that ignores nothing
      mockReadFile.mockRejectedValue(new Error("No ignore file"));

      await main(["src"]);

      expect(mockFindRoot).toHaveBeenCalled();
      expect(mockResolveConfig).toHaveBeenCalled();
      expect(mockFg).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          files: ["/root/src/file.ts"],
        }),
      );
    });

    it("should filter ignored files", async () => {
      // Mock finding files
      mockFg.mockResolvedValue(["/root/src/file.ts", "/root/dist/file.js"]);

      // Mock .gitignore
      mockReadFile.mockImplementation((path: string) => {
        if (path.endsWith(".gitignore")) {
          return Promise.resolve("dist/");
        }
        return Promise.reject(new Error("ENOENT"));
      });

      await main(["."]);

      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          files: ["/root/src/file.ts"],
        }),
      );
    });

    it("should use default pattern if no files provided", async () => {
      mockFg.mockResolvedValue([]);
      await main([]); // No args

      expect(mockFg).toHaveBeenCalledWith(
        expect.arrayContaining(["**/*.{ts,tsx,js,jsx,md,txt,json}"]),
        expect.any(Object),
      );
    });
  });
});
