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

  constructor(workspaceRoot?: string) {
    if (workspaceRoot) {
      this.cachePath = path.join(workspaceRoot, ".promptshield-cache.json");
    }
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

    try {
      const stats = await fs.stat(filePath);
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
    try {
      const stats = await fs.stat(filePath);
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

  async clear() {
    this.cache.entries = {};
    await this.save();
  }
}
