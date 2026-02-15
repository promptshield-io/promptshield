import * as vscode from "vscode";
import { DecorationManager } from "./protection/decorationManager";
import {
  handleFixWithAI,
  PromptShieldCodeActionProvider,
} from "./providers/codeActionProvider";
import { PromptShieldHoverProvider } from "./providers/hoverProvider";
import { PromptShieldStatusBar } from "./ui/statusBar";

export function activate(context: vscode.ExtensionContext) {
  console.log("PromptShield is active!");

  const decorationManager = new DecorationManager();
  decorationManager.activate(context);

  const hoverProvider = new PromptShieldHoverProvider(decorationManager);
  const codeActionProvider = new PromptShieldCodeActionProvider(
    decorationManager,
  );

  new PromptShieldStatusBar(context, decorationManager); // Init UI

  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ scheme: "file" }, hoverProvider),
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file" },
      codeActionProvider,
    ),

    vscode.commands.registerCommand("promptshield.scanWorkspace", () => {
      vscode.window.showInformationMessage(
        "Scanning workspace... (Implement full scan if needed)",
      );
      // Trigger refresh on active editor for now
      if (vscode.window.activeTextEditor) {
        // private method, but we can rely on file open/change events or expose a public refresh
        // forcing a re-open or just letting the user modify the file works.
        // For v1, let's keep it simple.
      }
    }),

    vscode.commands.registerCommand("promptshield.toggleXRay", () => {
      const enabled = decorationManager.toggleXRay();
      vscode.window.showInformationMessage(
        `X-Ray Mode: ${enabled ? "Enabled" : "Disabled"}`,
      );
    }),

    vscode.commands.registerCommand(
      "promptshield.fixWithAI",
      async (document: vscode.TextDocument, threat: any) => {
        await handleFixWithAI(document, threat);
      },
    ),
  );
}

export function deactivate() {}
