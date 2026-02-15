import * as vscode from "vscode";
import type { DecorationManager } from "../protection/decorationManager";

export class PromptShieldStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor(
    private context: vscode.ExtensionContext,
    private decorationManager: DecorationManager,
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.statusBarItem.command = "promptshield.toggleXRay";
    this.context.subscriptions.push(this.statusBarItem);

    // Initial State
    this.updateStatus(0);
    this.statusBarItem.show();

    // Listen for changes
    this.decorationManager.onThreatsChanged((count) => {
      this.updateStatus(count);
    });

    // Handle Active Editor Change (Reset to 0 or handle logic to get current threats if manager exposed them)
    // NOTE: The decorationManager fires the event when it refreshes for the active editor,
    // so we might rely on that. But if we switch to a file that hasn't changed, we need the current state.
    // Ideally DecorationManager should re-emit on active editor change for the new editor.
    // DecorationManager.activate handles onDidChangeActiveTextEditor -> refresh -> updateDecorations -> fires event.
    // So we are good!
  }

  private updateStatus(threatCount: number) {
    if (threatCount === 0) {
      this.statusBarItem.text = "$(shield) PromptShield";
      this.statusBarItem.tooltip = "PromptShield: No threats detected";
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = `$(shield) ${threatCount} Threats`;
      this.statusBarItem.tooltip = `PromptShield: ${threatCount} threats detected. Click to toggle X-Ray.`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
    }
  }
}
