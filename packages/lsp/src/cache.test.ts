/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CacheManager } from "./cache";

vi.mock("node:fs/promises");
vi.mock("node:path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:path")>();
  return {
    ...actual,
    join: vi.fn((...args) => args.join("/").replace(/\\/g, "/")),
  };
});
vi.mock("@promptshield/workspace", () => ({
  PROMPT_SHIELD_CACHE_FILE: ".promptshield-cache.json",
}));

describe("CacheManager", () => {
  let cacheManager: CacheManager;
  const workspaceRoot = "/mock/workspace";

  beforeEach(() => {
    vi.clearAllMocks();
    cacheManager = new CacheManager(workspaceRoot);
  });

  it("should initialize without a workspaceRoot", () => {
    const cm = new CacheManager();
    expect(cm.getEntries()).toEqual({});
  });

  it("should initialize with a workspaceRoot", () => {
    expect(cacheManager.getEntries()).toEqual({});
  });

  it("should load empty cache if file does not exist", async () => {
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));
    await cacheManager.load();
    expect(cacheManager.getEntries()).toEqual({});
  });

  it("should load cache from file", async () => {
    const mockData = {
      version: "1.0",
      entries: {
        "test.ts": { mtime: 1000, size: 50, version: "1.0", results: [] },
      },
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData));
    await cacheManager.load();
    expect(cacheManager.getEntries()).toEqual(mockData.entries);
  });

  it("should save cache to file", async () => {
    await cacheManager.save();
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("should return null if file is not in cache", async () => {
    const result = await cacheManager.get("missing.ts");
    expect(result).toBeNull();
  });

  it("should return cached results if file stats match", async () => {
    const mockThreats: any[] = [{ message: "threat" }];
    const mockData = {
      version: "1.0",
      entries: {
        "test.ts": {
          mtime: 1000,
          size: 50,
          version: "1.0",
          results: mockThreats,
        },
      },
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData));
    vi.mocked(fs.stat).mockResolvedValueOnce({
      mtimeMs: 1000,
      size: 50,
    } as any);

    const result = await cacheManager.get("test.ts");
    expect(result).toEqual(mockThreats);
  });

  it("should invalidate cache and return null if stats change", async () => {
    const mockThreats: any[] = [{ message: "threat" }];
    const mockData = {
      version: "1.0",
      entries: {
        "test.ts": {
          mtime: 1000,
          size: 50,
          version: "1.0",
          results: mockThreats,
        },
      },
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData));
    vi.mocked(fs.stat).mockResolvedValueOnce({
      mtimeMs: 2000,
      size: 60,
    } as any); // Different stats

    const result = await cacheManager.get("test.ts");
    expect(result).toBeNull();
    // Intentionally omitting toBeUndefined on getEntries because cache.ts doesn't eagerly delete it
  });

  it("should set new cache entry and save", async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({
      mtimeMs: 3000,
      size: 100,
    } as any);
    const mockThreats: any[] = [{ message: "new threat" }];

    await cacheManager.set("new.ts", mockThreats);

    expect(cacheManager.getEntries()["new.ts"]).toBeDefined();
    expect(cacheManager.getEntries()["new.ts"].results).toEqual(mockThreats);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("should handle stat error on set", async () => {
    vi.mocked(fs.stat).mockRejectedValueOnce(new Error("Stat failed"));
    await cacheManager.set("error.ts", []);
    expect(cacheManager.getEntries()["error.ts"]).toBeUndefined();
  });

  it("should remove entry and save", async () => {
    const mockData = {
      version: "1.0",
      entries: {
        "remove.ts": { mtime: 1000, size: 50, version: "1.0", results: [] },
      },
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData));
    await cacheManager.load();

    await cacheManager.remove("remove.ts");
    expect(cacheManager.getEntries()["remove.ts"]).toBeUndefined();
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("should gracefully handle remove when entry doesn't exist", async () => {
    await cacheManager.remove("nonexistent.ts");
    // Should not throw
  });

  it("should clear all entries and save", async () => {
    const mockData = {
      version: "1.0",
      entries: {
        "test1.ts": { mtime: 1000, size: 50, version: "1.0", results: [] },
        "test2.ts": { mtime: 2000, size: 60, version: "1.0", results: [] },
      },
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockData));
    await cacheManager.load();

    await cacheManager.clear();
    expect(cacheManager.getEntries()).toEqual({});
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it("gracefully handles save failure", async () => {
    vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("Write error"));
    await expect(cacheManager.save()).resolves.not.toThrow();
  });

  it("noops load and save if no workspace root is set", async () => {
    const cm = new CacheManager();
    await cm.load(); // Should immediately return
    expect(cm.getEntries()).toEqual({});

    await cm.save(); // Should immediately return
  });
});
