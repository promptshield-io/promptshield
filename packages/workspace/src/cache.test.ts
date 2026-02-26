/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { open, readdir, readFile, rm, stat } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CacheManager, recommendMode } from "./cache";
import { atomicWrite } from "./utils";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  open: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("./utils", () => ({
  atomicWrite: vi.fn(),
  createLimiter: vi.fn(() => (task: any) => task()),
  ensureDir: vi.fn(),
  sha256: vi.fn((input) => `hashed-${input}`),
}));

describe("cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recommendMode", () => {
    it("should recommend single mode for small repositories", () => {
      expect(recommendMode(100, 1000)).toBe("single");
    });

    it("should recommend split mode for large repositories", () => {
      expect(recommendMode(1001, 1000)).toBe("split");
    });
  });

  describe("CacheManager", () => {
    const defaultOptions = {
      workspaceRoot: "/workspace",
      artifactsDir: ".promptshield",
      mode: "auto" as const,
      fileCount: 500,
    };

    describe("Initialization", () => {
      it("should resolve mode from state.json if it exists", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
          JSON.stringify({ mode: "split" }),
        );

        const manager = new CacheManager(defaultOptions);
        expect((manager as any).mode).toBe("split");
      });

      it("should compute mode and save to state.json if not present and auto", () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const manager = new CacheManager(defaultOptions); // < 1000 defaults to single
        expect((manager as any).mode).toBe("single");
        expect(writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining("state.json"),
          expect.stringContaining('"mode": "single"'),
          "utf-8",
        );
      });

      it("should respect explicit mode override", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
          JSON.stringify({ mode: "single" }),
        );

        const manager = new CacheManager({ ...defaultOptions, mode: "split" });
        expect((manager as any).mode).toBe("split");
      });
    });

    describe("get()", () => {
      it("should handle single mode cache hit", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "single" });

        vi.mocked(stat).mockResolvedValue({ mtimeMs: 1234, size: 5678 } as any);
        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify({
            version: 2,
            entries: {
              "file.ts": { mtime: 1234, size: 5678, results: { threats: [] } },
            },
          }),
        );

        const result = await manager.get("file.ts");
        expect(result).toEqual({ threats: [] });
      });

      it("should handle single mode cache invalidation on size mismatch", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "single" });

        vi.mocked(stat).mockResolvedValue({ mtimeMs: 1234, size: 9999 } as any); // mismatch size
        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify({
            version: 2,
            entries: {
              "file.ts": { mtime: 1234, size: 5678, results: { threats: [] } },
            },
          }),
        );

        const result = await manager.get("file.ts");
        expect(result).toBeNull();
      });

      it("should handle split mode cache hit", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "split" });

        vi.mocked(stat).mockResolvedValue({ mtimeMs: 1234, size: 5678 } as any);
        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify({
            version: 2,
            relPath: "file.ts",
            mtime: 1234,
            size: 5678,
            results: { threats: [] },
          }),
        );

        const result = await manager.get("file.ts");
        expect(result).toEqual({ threats: [] });
      });
    });

    describe("set()", () => {
      it("should write to cache.json with lock in single mode", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "single" });

        vi.mocked(stat).mockResolvedValue({ mtimeMs: 1234, size: 5678 } as any);

        // Mock loadSingle readFile resolution to avoid crashing on parse
        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify({ version: 2, entries: {} }),
        );

        const mockHandle = { write: vi.fn(), close: vi.fn() };
        vi.mocked(open).mockResolvedValue(mockHandle as any); // Lock acquire succeeds

        await manager.set("file.ts", { threats: [] } as any);

        expect(open).toHaveBeenCalledWith(
          expect.stringContaining("cache.lock"),
          "wx",
        );
        expect(atomicWrite).toHaveBeenCalledWith(
          expect.stringContaining("cache.json"),
          expect.stringContaining("1234"), // mtime
        );
        expect(rm).toHaveBeenCalledWith(expect.stringContaining("cache.lock"), {
          force: true,
        });
      });

      it("should write hashed individual files in split mode", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "split" });

        vi.mocked(stat).mockResolvedValue({ mtimeMs: 1234, size: 5678 } as any);

        await manager.set("file.ts", { threats: [] } as any);

        expect(atomicWrite).toHaveBeenCalledWith(
          expect.stringContaining("hashed-file.ts.json"),
          expect.stringContaining("1234"),
        );
      });
    });

    describe("clear()", () => {
      it("should clear the cache directory and files", async () => {
        const manager = new CacheManager(defaultOptions);
        await manager.clear();

        expect(rm).toHaveBeenCalledWith(
          expect.stringContaining("cache"),
          expect.any(Object),
        );
        expect(rm).toHaveBeenCalledWith(
          expect.stringContaining("cache.json"),
          expect.any(Object),
        );
        expect(rm).toHaveBeenCalledWith(
          expect.stringContaining("state.json"),
          expect.any(Object),
        );
      });
    });

    describe("shouldRecommendModeSwitch()", () => {
      it("should recommend switch from single to split if file count greatly exceeds threshold", () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "single" });
        // CACHE_SPLIT_THRESHOLD defaults to 1000, acceptableDeviation 0.1
        expect(manager.shouldRecommendModeSwitch(2000, 0.1, 1000)).toBe(
          "split",
        );
      });

      it("should not recommend switch if within acceptable deviation", () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "single" });
        expect(manager.shouldRecommendModeSwitch(1050, 0.1, 1000)).toBe(false);
      });

      it("should return false if already in the target mode", () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "single" });
        expect(manager.shouldRecommendModeSwitch(500, 0.1, 1000)).toBe(false); // Should stay single
      });
    });

    describe("mergeSplitToSingle()", () => {
      it("should be a no-op if not in split mode", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "single" });
        await manager.mergeSplitToSingle();
        expect(readdir).not.toHaveBeenCalled();
      });

      it("should read directory and write cache.json and switch to single mode", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "split" });

        vi.mocked(readdir).mockResolvedValue(["hash1.json"] as any);
        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify({
            version: 2,
            relPath: "file1.ts",
            mtime: 1234,
            size: 5678,
            results: { threats: [] },
          }),
        );

        await manager.mergeSplitToSingle();

        expect(readdir).toHaveBeenCalled();
        expect(readFile).toHaveBeenCalledWith(
          expect.stringContaining("hash1.json"),
          "utf-8",
        );
        expect(atomicWrite).toHaveBeenCalledWith(
          expect.stringContaining("cache.json"),
          expect.stringContaining('"file1.ts"'),
        );
        expect((manager as any).mode).toBe("single");
      });

      it("should ignore improperly versioned files from merge", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "split" });

        vi.mocked(readdir).mockResolvedValue(["hash1.json"] as any);
        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify({
            version: 1, // Bad schema version
            relPath: "file1.ts",
          }),
        );

        await manager.mergeSplitToSingle();
        expect(atomicWrite).toHaveBeenCalledWith(
          expect.stringContaining("cache.json"),
          expect.stringContaining("{}"), // Empty entries
        );
      });
    });

    describe("splitSingleToSplit()", () => {
      it("should be a no-op if not in single mode", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "split" });
        await manager.splitSingleToSplit();
        expect(atomicWrite).not.toHaveBeenCalled();
      });

      it("should write separate hashed json files and switch to split mode", async () => {
        const manager = new CacheManager({ ...defaultOptions, mode: "single" });

        vi.mocked(readFile).mockResolvedValue(
          JSON.stringify({
            version: 2,
            entries: {
              "file1.ts": { mtime: 1234, size: 5678, results: { threats: [] } },
            },
          }),
        );

        await manager.splitSingleToSplit();

        expect(atomicWrite).toHaveBeenCalledWith(
          expect.stringContaining("hashed-file1.ts.json"),
          expect.stringContaining('"relPath":"file1.ts"'),
        );
        expect((manager as any).mode).toBe("split");
      });
    });
  });
});
