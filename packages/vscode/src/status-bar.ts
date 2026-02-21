import { SOURCE } from "@promptshield/lsp";
import * as vscode from "vscode";
import type { DecorationManager } from "./decoration-manager";
import { isPromptShieldArtifact } from "./utils";
export const CMD_SHOW_MENU = "promptshield.showMenu";

export class PromptShieldStatusBar implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private isLoading = false;
  private fileThreatCount = 0;
  private workspaceThreatCount = 0;
  private disposables: vscode.Disposable[] = [];
  private decorationManager: DecorationManager;

  constructor(decorationManager: DecorationManager) {
    this.decorationManager = decorationManager;

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.statusBarItem.command = CMD_SHOW_MENU;
    this.disposables.push(this.statusBarItem);

    // Listen for changes in the active editor to show file-specific count
    this.disposables.push(
      this.decorationManager.onThreatsChanged(({ count }) => {
        this.fileThreatCount = count;
        this.updateStatus();
      }),
    );

    // Listen for ANY diagnostic change to update workspace count
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(() => {
        this.updateWorkspaceCount();
      }),
    );

    this.updateWorkspaceCount();
    this.updateStatus();
    this.statusBarItem.show();
  }

  public dispose() {
    this.disposables.forEach((d) => {
      d.dispose();
    });
  }

  private updateWorkspaceCount() {
    let total = 0;
    const allDiagnostics = vscode.languages.getDiagnostics();
    for (const [uri, diagnostics] of allDiagnostics) {
      // Skip tracking PromptShield generated artifact files toward workspace total.
      if (isPromptShieldArtifact(uri)) {
        continue;
      }

      // Filter for PromptShield diagnostics
      const psDiagnostics = diagnostics.filter((d) => d.source === SOURCE);
      total += psDiagnostics.length;
    }
    this.workspaceThreatCount = total;
    this.updateStatus();
  }

  /**
   * Set loading state.
   */
  public setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.updateStatus();
  }

  /**
   * Update workspace threat count.
   */
  public setWorkspaceThreatCount(count: number): void {
    this.workspaceThreatCount = count;
    this.updateStatus();
  }

  /**
   * Update status bar UI based on threat count.
   */
  private updateStatus(): void {
    if (this.isLoading) {
      this.statusBarItem.text = "$(sync~spin) PromptShield";
      this.statusBarItem.tooltip = "PromptShield: Scanning...";
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    if (this.fileThreatCount === 0 && this.workspaceThreatCount === 0) {
      this.statusBarItem.text = "$(shield) PromptShield";
      this.statusBarItem.tooltip = "PromptShield: No threats detected";
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    // Format: {fileThreat} | {workspaceThreats} if both exist, or variants
    if (this.workspaceThreatCount > 0) {
      this.statusBarItem.text = `$(shield) ${this.fileThreatCount} | ${this.workspaceThreatCount}`;
      this.statusBarItem.tooltip = `PromptShield: ${this.fileThreatCount} threats in file, ${this.workspaceThreatCount} in workspace.`;
    } else {
      // Only file threats
      this.statusBarItem.text = `$(shield) ${this.fileThreatCount}`;
      this.statusBarItem.tooltip = `PromptShield: ${this.fileThreatCount} threats detected in file.`;
    }

    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground",
    );
  }
}
