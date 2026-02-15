import { scan, type ThreatReport } from "@promptshield/core";
import type * as vscode from "vscode";

interface CachedResult {
  version: number;
  threats: ThreatReport[];
}

export class Scanner {
  private cache = new Map<string, CachedResult>();

  /**
   * Scans a specific range of text.
   * Useful for partial updates (incremental scanning).
   */
  public scanRange(text: string): ThreatReport[] {
    const result = scan(text);
    return result.threats;
  }

  /**
   * Scans the entire document, using cache if available and document version hasn't changed.
   */
  public scanDocument(document: vscode.TextDocument): ThreatReport[] {
    const key = document.uri.toString();
    const cached = this.cache.get(key);

    if (cached && cached.version === document.version) {
      return cached.threats;
    }

    const text = document.getText();
    const result = scan(text);

    this.cache.set(key, {
      version: document.version,
      threats: result.threats,
    });

    return result.threats;
  }

  /**
   * Clears cache for a specific file (e.g., on close).
   */
  public clearCache(uri: vscode.Uri) {
    this.cache.delete(uri.toString());
  }
}
