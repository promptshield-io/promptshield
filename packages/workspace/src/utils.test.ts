/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  atomicWrite,
  createLimiter,
  ensureDir,
  isBinary,
  sha256,
} from "./utils";

vi.mock("node:crypto", () => ({
  createHash: vi.fn(),
  randomUUID: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  open: vi.fn(),
  rename: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  rm: vi.fn(),
}));

describe("utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLimiter", () => {
    it("should limit concurrent executions", async () => {
      const limiter = createLimiter(2);
      let active = 0;
      let maxActive = 0;
      let completed = 0;

      const task = async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 10)); // simulate work
        active--;
        completed++;
      };

      const tasks = Array.from({ length: 5 }, () => limiter(task));
      await Promise.all(tasks);

      expect(maxActive).toBe(2);
      expect(completed).toBe(5);
    });

    it("should default to a concurrency of 1 if given an invalid number", async () => {
      const limiter = createLimiter(0);
      let active = 0;
      let maxActive = 0;

      const task = async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 10)); // simulate work
        active--;
      };

      const tasks = Array.from({ length: 3 }, () => limiter(task));
      await Promise.all(tasks);

      expect(maxActive).toBe(1);
    });
  });

  describe("ensureDir", () => {
    it("should recursively create a directory", async () => {
      await ensureDir("/test/dir");
      expect(mkdir).toHaveBeenCalledWith("/test/dir", { recursive: true });
    });
  });

  describe("atomicWrite", () => {
    it("should write to a temp file and rename it", async () => {
      vi.mocked(randomUUID).mockReturnValue("mock-uuid" as any);
      const testPath = "/test/dir/file.txt";
      const testData = "test data";

      await atomicWrite(testPath, testData);

      const tmpPath = join(dirname(testPath), "mock-uuid.tmp");

      expect(writeFile).toHaveBeenCalledWith(tmpPath, testData, "utf-8");
      expect(rename).toHaveBeenCalledWith(tmpPath, testPath);
    });
  });

  describe("sha256", () => {
    it("should compute a sha256 hash", () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockDigest = vi.fn().mockReturnValue("mock-hash");
      vi.mocked(createHash).mockReturnValue({
        update: mockUpdate,
        digest: mockDigest,
      } as any);

      const result = sha256("test-input");

      expect(createHash).toHaveBeenCalledWith("sha256");
      expect(mockUpdate).toHaveBeenCalledWith("test-input");
      expect(mockDigest).toHaveBeenCalledWith("hex");
      expect(result).toBe("mock-hash");
    });
  });

  describe("isBinary", () => {
    it("should detect text files", async () => {
      vi.mocked(open).mockResolvedValue({
        read: vi.fn().mockImplementation(async (buf: Buffer) => {
          const text = Buffer.from("hello world");
          text.copy(buf);
          return { bytesRead: text.length };
        }),
        close: vi.fn(),
      } as any);

      const result = await isBinary("file.txt");
      expect(result).toBe(false);
    });

    it("should immediately detect null bytes", async () => {
      vi.mocked(open).mockResolvedValue({
        read: vi.fn().mockImplementation(async (buf: Buffer) => {
          const text = Buffer.from([0x68, 0x65, 0x00, 0x6c, 0x6c, 0x6f]); // "he\0llo"
          text.copy(buf);
          return { bytesRead: text.length };
        }),
        close: vi.fn(),
      } as any);

      const result = await isBinary("file.txt");
      expect(result).toBe(true);
    });

    it("should detect high ratios of suspicious characters", async () => {
      vi.mocked(open).mockResolvedValue({
        read: vi.fn().mockImplementation(async (buf: Buffer) => {
          // > 30% control characters
          const text = Buffer.from([
            0x01, 0x02, 0x03, 0x04, 0x68, 0x65, 0x6c, 0x6c, 0x6f,
          ]);
          text.copy(buf);
          return { bytesRead: text.length };
        }),
        close: vi.fn(),
      } as any);

      const result = await isBinary("file.txt");
      expect(result).toBe(true);
    });

    it("should default to true if unreadable", async () => {
      vi.mocked(open).mockRejectedValue(new Error("access denied"));

      const result = await isBinary("file.txt");
      expect(result).toBe(true);
    });
  });
});
