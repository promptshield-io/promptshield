import type { ThreatReport } from "@promptshield/core";
import * as vscode from "vscode";
import type { DecorationManager } from "../protection/decorationManager";

export class PromptShieldCodeActionProvider
  implements vscode.CodeActionProvider
{
  constructor(private decorationManager: DecorationManager) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    const actions: vscode.CodeAction[] = [];

    // Find threats in the range
    // Since range can be a selection or cursor, we check if any threat intersects
    const threats = this.decorationManager.getThreatsAt(document, range.start); // Simplified for cursor

    for (const t of threats) {
      // 1. Deterministic Fix: Remove
      const removeAction = new vscode.CodeAction(
        `Remove ${t.readableLabel || "Character"}`,
        vscode.CodeActionKind.QuickFix,
      );
      removeAction.edit = new vscode.WorkspaceEdit();
      const start = document.positionAt(t.loc.index);
      const end = document.positionAt(t.loc.index + t.offendingText.length);
      removeAction.edit.delete(document.uri, new vscode.Range(start, end));
      actions.push(removeAction);

      // 2. AI Fix
      const aiAction = new vscode.CodeAction(
        `✨ Fix with AI`,
        vscode.CodeActionKind.QuickFix,
      );
      aiAction.command = {
        command: "promptshield.fixWithAI",
        title: "Fix with AI",
        arguments: [document, t],
      };
      actions.push(aiAction);
    }

    return actions;
  }
}

export async function handleFixWithAI(
  document: vscode.TextDocument,
  threat: ThreatReport,
) {
  try {
    const models = await vscode.lm.selectChatModels({ family: "gpt-4" }); // Prefer GPT-4
    let model = models[0];
    if (!model) {
      const allModels = await vscode.lm.selectChatModels({});
      model = allModels[0];
    }

    if (!model) {
      vscode.window.showErrorMessage(
        "No language models available for PromptShield AI Fix.",
      );
      return;
    }

    const start = document.positionAt(threat.loc.index);
    const end = document.positionAt(
      threat.loc.index + threat.offendingText.length,
    );
    const range = new vscode.Range(start, end);

    // Context: Get line or surrounding context
    const line = document.lineAt(start.line).text;

    const messages = [
      vscode.LanguageModelChatMessage.User(
        `Fix the following security threat in the code snippet below. 
                Threat: ${threat.message}
                Offending Text: "${threat.offendingText}"
                Context: "${line}"
                
                Return ONLY the corrected text replacement for the offending text, nothing else.`,
      ),
    ];

    const cancellationToken = new vscode.CancellationTokenSource().token;
    const response = await model.sendRequest(messages, {}, cancellationToken);

    let fixedText = "";
    for await (const fragment of response.text) {
      fixedText += fragment;
    }

    if (fixedText) {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, range, fixedText.trim()); // Trim to be safe
      await vscode.workspace.applyEdit(edit);
    }
  } catch (e) {
    vscode.window.showErrorMessage(`PromptShield AI Fix failed: ${e}`);
  }
}
