import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ThreatReport } from "@promptshield/core";

interface CacheEntry {
  mtime: number;
  size: number;
  version: string;
  results: ThreatReport[];
}

interface CacheData {
  version: string;
  entries: Record<string, CacheEntry>;
}

export class CacheManager {
  private cache: CacheData = { version: "1.0", entries: {} };
  private cachePath: string | null = null;
  private isLoaded = false;
  private workspaceRoot: string | null = null;

  constructor(workspaceRoot?: string) {
    if (workspaceRoot) {
      this.workspaceRoot = workspaceRoot;
      this.cachePath = path.join(workspaceRoot, ".promptshield-cache.json");
    }
  }

  getEntries(): Record<string, CacheEntry> {
    return this.cache.entries;
  }

  async load() {
    if (!this.cachePath) return; // No workspace, in-memory only (or no-op)

    try {
      const data = await fs.readFile(this.cachePath, "utf-8");
      this.cache = JSON.parse(data);
      this.isLoaded = true;
    } catch {
      // Ignore error (file likely doesn't exist)
      this.cache = { version: "1.0", entries: {} };
    }
  }

  async save() {
    if (!this.cachePath) return;
    try {
      await fs.writeFile(
        this.cachePath,
        JSON.stringify(this.cache, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("Failed to save cache:", e);
    }
  }

  async get(filePath: string): Promise<ThreatReport[] | null> {
    if (!this.isLoaded) await this.load();

    const entry = this.cache.entries[filePath];
    if (!entry) return null;

    const absolutePath = this.workspaceRoot
      ? path.join(this.workspaceRoot, filePath)
      : filePath;

    try {
      const stats = await fs.stat(absolutePath);
      if (stats.mtimeMs === entry.mtime && stats.size === entry.size) {
        return entry.results;
      }
    } catch {
      // File missing or error, invalidate
      delete this.cache.entries[filePath];
    }

    return null;
  }

  async set(filePath: string, results: ThreatReport[]) {
    const absolutePath = this.workspaceRoot
      ? path.join(this.workspaceRoot, filePath)
      : filePath;

    try {
      const stats = await fs.stat(absolutePath);
      this.cache.entries[filePath] = {
        mtime: stats.mtimeMs,
        size: stats.size,
        version: "1.0", // Schema version
        results,
      };
      // Auto-save or debounce could be added here
      await this.save();
    } catch (e) {
      console.error(`Failed to update cache for ${filePath}:`, e);
    }
  }

  async remove(filePath: string) {
    if (this.cache.entries[filePath]) {
      delete this.cache.entries[filePath];
      await this.save();
    }
  }

  async clear() {
    this.cache.entries = {};
    await this.save();
  }
}
