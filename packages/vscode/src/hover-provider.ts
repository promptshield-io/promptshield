import * as vscode from "vscode";
import type { DecorationManager } from "./decoration-manager";

export class PromptShieldHoverProvider implements vscode.HoverProvider {
  constructor(private decorationManager: DecorationManager) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    const threats = this.decorationManager.getThreatsAt(document, position);

    if (threats.length === 0) {
      return null;
    }

    const contents: vscode.MarkdownString[] = [];

    for (const t of threats) {
      const md = new vscode.MarkdownString();
      md.isTrusted = true;
      md.supportHtml = true;

      md.appendMarkdown(`### 🛡️ PromptShield: ${t.category}\n\n`);
      md.appendMarkdown(`**Severity:** ${t.severity}\n\n`);
      md.appendMarkdown(`${t.message}\n\n`);

      if (t.suggestion) {
        md.appendMarkdown(`**Suggestion:** ${t.suggestion}\n`);
      }

      contents.push(md);
    }

    return new vscode.Hover(contents);
  }
}
