import type { ThreatReport } from "@promptshield/core";
import * as vscode from "vscode";
import type { DecorationManager } from "./decoration-manager";

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
    const threats = this.decorationManager.getThreatsAt(document, range.start);

    let aiFixAdded = false;
    let ignoreAdded = false;

    for (const t of threats) {
      // 1. Deterministic Fix: Remove
      const label = t.readableLabel || "Character";
      const removeAction = new vscode.CodeAction(
        `Remove ${label}`,
        vscode.CodeActionKind.QuickFix,
      );
      removeAction.edit = new vscode.WorkspaceEdit();
      const start = document.positionAt(t.loc.index);
      const end = document.positionAt(t.loc.index + t.offendingText.length);
      removeAction.edit.delete(document.uri, new vscode.Range(start, end));
      actions.push(removeAction);

      // 2. Ignore Action (Once per line/group)
      if (!ignoreAdded) {
        const ignoreAction = new vscode.CodeAction(
          "Ignore this line (PromptShield)",
          vscode.CodeActionKind.QuickFix,
        );
        ignoreAction.edit = new vscode.WorkspaceEdit();
        // Insert comment on previous line
        const line = document.lineAt(range.start.line);
        const indentation = line.text.match(/^\s*/)?.[0] || "";
        const comment = `${indentation}// promptshield-ignore\n`;
        ignoreAction.edit.insert(document.uri, line.range.start, comment);
        actions.push(ignoreAction);
        ignoreAdded = true;
      }

      // 3. AI Fix (Once)
      if (!aiFixAdded) {
        const aiAction = new vscode.CodeAction(
          `✨ Fix with AI`,
          vscode.CodeActionKind.QuickFix,
        );
        aiAction.command = {
          command: "promptshield.fixWithAI",
          title: "Fix with AI",
          arguments: [document, t], // Pass the first threat as primary context
        };
        actions.push(aiAction);
        aiFixAdded = true;
      }
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
