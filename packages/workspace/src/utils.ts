import { createHash, randomUUID } from "node:crypto";
import {
  access,
  type FileHandle,
  mkdir,
  open,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Creates a minimal promise concurrency limiter.
 *
 * The returned function ensures that no more than the specified number
 * of async tasks execute concurrently. Tasks beyond the limit are queued
 * and resumed in FIFO order.
 *
 * This implementation is intentionally lightweight to avoid external
 * dependencies while remaining predictable and fully auditable.
 *
 * @param concurrency - Maximum number of concurrent tasks. Must be >= 1.
 * @returns A limiter function that wraps async work.
 */
export const createLimiter = (concurrency: number) => {
  const max = Math.max(1, concurrency);
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    active--;
    queue.shift()?.();
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= max) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }

    active++;

    try {
      return await task();
    } finally {
      next();
    }
  };
};

/**
 * Heuristically determines whether a file should be treated as binary.
 *
 * Detection strategy:
 * 1. Reads only the first `sampleSize` bytes (default: 8 KB).
 * 2. Immediately returns `true` if a NULL byte (0x00) is found.
 * 3. Computes the ratio of suspicious non-printable bytes.
 *    If the ratio exceeds `suspiciousThreshold`, the file is treated as binary.
 *
 * Suspicious bytes:
 * - Control characters outside common whitespace
 * - Bytes < 7 or between 15–31 (excluding \t, \n, \r)
 *
 * This approach is:
 * - Fast (does not read entire file)
 * - Safe for large workspace scans
 * - Reliable for common binary formats (PNG, JPEG, ZIP, etc.)
 *
 * ⚠️ This is a heuristic, not MIME detection.
 * Some exotic encodings may bypass detection.
 *
 * @param filePath - Absolute path to file.
 * @param sampleSize - Number of bytes to inspect from file start.
 * @param suspiciousThreshold - Ratio (0–1) above which file is considered binary.
 * @returns `true` if file appears binary; otherwise `false`.
 *
 * @example
 * ```ts
 * if (await isBinary("/path/to/image.png")) {
 *   return; // Skip scanning
 * }
 * ```
 */
export const isBinary = async (
  filePath: string,
  sampleSize = 8192,
  suspiciousThreshold = 0.3,
): Promise<boolean> => {
  let handle: FileHandle | undefined;

  try {
    handle = await open(filePath, "r");

    const buffer = Buffer.allocUnsafe(sampleSize);
    const { bytesRead } = await handle.read(buffer, 0, sampleSize, 0);

    if (bytesRead === 0) return false; // Empty file = text-safe

    let suspicious = 0;

    for (let i = 0; i < bytesRead; i++) {
      const byte = buffer[i];

      // Immediate binary signal
      if (byte === 0) return true;

      // Count suspicious control chars
      if (byte < 7 || (byte > 14 && byte < 32)) {
        suspicious++;
      }
    }

    return suspicious / bytesRead > suspiciousThreshold;
  } catch {
    // Fail-safe: unreadable files treated as binary
    return true;
  } finally {
    await handle?.close();
  }
};

/**
 * Ensures that a directory exists.
 *
 * Behavior:
 * - Creates the directory recursively if it does not exist.
 * - No-op if the directory already exists.
 *
 * Guarantees:
 * - Idempotent.
 * - Safe to call concurrently.
 *
 * Typical Usage:
 * - Preparing artifact directories.
 * - Ensuring cache or output paths exist before writing.
 *
 * @param dir Absolute or relative directory path.
 */
export const ensureDir = async (dir: string): Promise<void> => {
  await mkdir(dir, { recursive: true });
};

/**
 * Atomically writes a file using a temporary file + rename strategy.
 *
 * Strategy:
 * 1. Write contents to a uniquely named temporary file
 *    in the same directory as the target.
 * 2. Atomically rename the temporary file to the target path.
 *
 * Why this matters:
 * - Prevents partially written files.
 * - Ensures readers never observe truncated JSON.
 * - Safe under concurrent writers (last-writer-wins).
 *
 * Concurrency Model:
 * - Each invocation uses a `randomUUID()` temp filename
 *   to avoid cross-process collisions.
 * - Rename is atomic on the same filesystem.
 * - No locking is performed here.
 *
 * Limitations:
 * - Does not prevent logical race conditions.
 * - If two processes write simultaneously, the last rename wins.
 * - Both temp and target must reside on the same filesystem
 *   for atomic guarantees.
 *
 * @param path Absolute target file path.
 * @param data UTF-8 string content to persist.
 */
export const atomicWrite = async (
  path: string,
  data: string,
): Promise<void> => {
  const tmp = join(dirname(path), `${randomUUID()}.tmp`);

  await writeFile(tmp, data, "utf-8");
  await safeRename(tmp, path);
};

/**
 * Safely renames a file or directory.
 * - Skips if source does not exist
 * - Removes target if already exists
 *
 * Prevents common Windows EPERM failures due to leftover folders.
 */
export const safeRename = async (from: string, to: string) => {
  try {
    await access(from);
  } catch {
    return;
  }

  try {
    await access(to);
    await rm(to, { recursive: true, force: true });
  } catch {
    // target does not exist
  }

  await rename(from, to);
};

/**
 * Generates a deterministic SHA-256 hex digest.
 *
 * Intended for:
 * - Stable cache keys
 * - Filename hashing
 * - Identity normalization
 *
 * Not intended for:
 * - Password hashing
 * - Security-sensitive operations
 */
export const sha256 = (input: string): string =>
  createHash("sha256").update(input).digest("hex");
