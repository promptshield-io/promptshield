import * as vscode from "vscode";
import type { DecorationManager } from "./decoration-manager";

export class PromptShieldStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private isLoading = false;
  private lastThreatCount = 0;

  constructor(
    private context: vscode.ExtensionContext,
    private decorationManager: DecorationManager,
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.statusBarItem.command = "promptshield.showDetailedReport";
    this.context.subscriptions.push(this.statusBarItem);

    this.statusBarItem.show();

    // React to threat updates
    this.decorationManager.onThreatsChanged((count) => {
      this.lastThreatCount = count;
      // If we get an update, loading is done
      this.setLoading(false);
    });
  }

  /**
   * Set loading state.
   */
  public setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.updateStatus(this.lastThreatCount);
  }

  /**
   * Update status bar UI based on threat count.
   */
  private updateStatus(threatCount: number): void {
    if (this.isLoading) {
      this.statusBarItem.text = "$(sync~spin) PromptShield";
      this.statusBarItem.tooltip = "PromptShield: Scanning...";
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    if (threatCount === 0) {
      this.statusBarItem.text = "$(shield) PromptShield";
      this.statusBarItem.tooltip = "PromptShield: No threats detected";
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    this.statusBarItem.text = `$(shield) ${threatCount} Threat${
      threatCount === 1 ? "" : "s"
    }`;

    this.statusBarItem.tooltip =
      "PromptShield: Threats detected — click to view report.";

    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground",
    );
  }
}
