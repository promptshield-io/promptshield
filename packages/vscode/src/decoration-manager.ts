import type { ThreatReport } from "@promptshield/core";
import * as vscode from "vscode";

export class DecorationManager {
  private rangeDecorationType: vscode.TextEditorDecorationType;
  private eolDecorationType: vscode.TextEditorDecorationType;
  private documentThreats = new Map<string, ThreatReport[]>();

  private _onThreatsChanged = new vscode.EventEmitter<number>();
  public readonly onThreatsChanged = this._onThreatsChanged.event;

  constructor() {
    this.rangeDecorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy red",
      overviewRulerColor: "red",
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    this.eolDecorationType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      after: {
        color: new vscode.ThemeColor("promptshield.ghostTextForeground"),
        margin: "0 0 0 20px",
      },
    });
  }

  public getAllThreats(uri: vscode.Uri): ThreatReport[] {
    return this.documentThreats.get(uri.toString()) || [];
  }

  public getThreatsAt(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): ThreatReport[] {
    const threats = this.documentThreats.get(document.uri.toString()) || [];
    return threats.filter((t) => {
      // Logic to find threat at position
      // t.loc.index is 0-based index? core uses 0-based index or 1-based line?
      // Core ThreatReport: loc: { line, column, index }
      // We can use range from diagnostic if available, but here we stored ThreatReport.
      // Let's reconstruct range or use logic.

      const start = document.positionAt(t.loc.index);
      const end = document.positionAt(t.loc.index + t.offendingText.length);
      const range = new vscode.Range(start, end);
      return range.contains(position);
    });
  }

  public activate(context: vscode.ExtensionContext) {
    // Listen for diagnostics changes
    context.subscriptions.push(
      vscode.languages.onDidChangeDiagnostics((e) => {
        for (const uri of e.uris) {
          this.updateFromDiagnostics(uri);
        }
      }),
      // Also update on active editor change to ensure decorations are visible/refreshed
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.updateFromDiagnostics(editor.document.uri);
        }
      }),
    );

    // Initial update for active editor
    if (vscode.window.activeTextEditor) {
      this.updateFromDiagnostics(vscode.window.activeTextEditor.document.uri);
    }
  }

  private updateFromDiagnostics(uri: vscode.Uri) {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    const promptShieldDiagnostics = diagnostics.filter(
      (d) => d.source === "PromptShield",
    );

    const threats: ThreatReport[] = promptShieldDiagnostics.map((d) => {
      // We attached the full ThreatReport in `data` field of diagnostic in LSP
      // If getting from VSCode API, `d` is `vscode.Diagnostic`.
      // Does VSCode preserve `data`?
      // `vscode.Diagnostic` does not have `data` property in standard API?
      // Wait, LSP `Diagnostic` has `data`. VSCode API `Diagnostic` might not expose it easily or it is in `code` or `relatedInformation`?
      // Actually, VSCode `Diagnostic` class in `vscode` module does NOT have `data`.
      // Only `code` (string | number | { value, target }).

      // ISSUE: LSP `data` field is not automatically mapped to a property on `vscode.Diagnostic` object available to extension.
      // The extension consumes `vscode.Diagnostic` which is a different type than `lsp.Diagnostic`.
      // I might need to command the LSP to get the threats or just use the range/message from diagnostic to reconstruct minimal info,
      // OR rely on `code` field if I can pack info there (limited).
      //
      // Re-reading requirements: "VSCode extension must not call @promptshield/core directly... VSCode consumes diagnostics from LSP"
      // "DecorationManager... consume diagnostics".
      //
      // If I cannot get `ThreatReport` object back, I can't easily get `offendingText` or `loc` exactly as before unless I parse the range.
      //
      // But `offendingText` is needed for `getThreatsAt`?
      // Actually `getThreatsAt` is used for Code Actions or Hover?
      // Hover is provided by `hoverProvider` using `getThreatsAt`.
      // If I have the range from diagnostic, I can use that.
      //
      // Let's look at `getThreatsAt`. It returns `ThreatReport[]`.
      // If I change internal storage to store `Diagnostic` or a wrapper, I can adapt `getThreatsAt`.
      //
      // What does `ThreatReport` contain?
      // interface ThreatReport {
      //   checkId: string;
      //   category: string;
      //   severity: Severity;
      //   message: string;
      //   offendingText: string;
      //   loc: { line: number; column: number; index: number };
      //   readableLabel?: string;
      //   url?: string;
      // }
      //
      // Diagnostic has `range`, `message`, `code` (category), `severity`, `source`.
      // It misses `offendingText`, `checkId`, `readableLabel`, `url`.
      // `offendingText` can be read from document using range.
      // `checkId`? Maybe `code`?
      // `readableLabel`? Maybe put in message or `code`?

      // Current `diagnostics.ts` puts `category` in `code`.
      // `startLine`/`startChar` in `range`.

      // I can reconstruct a "partial" ThreatReport from diagnostic + document text.
      //
      // But wait, if I can't get `data`, I lose `readableLabel` or `url` if they were there.
      //
      // Alternative: Use `executeCommand` to specific LSP request to get threats? No, that's complex.
      //
      // Actually, could I put JSON in `code`? `d.code` can be string.
      // Or check if `vscode-languageclient` exposes `data`?
      // The `LanguageClient` middleware can intercept diagnostics maybe?
      //
      // Or simpler: Just work with what Diagnostic gives.
      // `offendingText` => `document.getText(range)`.
      // `category` => `code`.
      // `message` => `message`.
      //
      // Let's adjust `DecorationManager` to not strictly depend on `ThreatReport` object details that are missing,
      // or reconstruct them.

      // I will reconstruct `ThreatReport` from `Diagnostic`.

      const range = d.range;
      // We usually don't have document here easily in this map function without passing it.
      // But we are in `updateFromDiagnostics`, we can get document.
      const textDoc = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === uri.toString(),
      );

      let offendingText = "";
      let index = 0;
      if (textDoc) {
        offendingText = textDoc.getText(range);
        index = textDoc.offsetAt(range.start);
      }

      return {
        checkId: String(d.code) || "unknown", // mapped from category
        category: String(d.code) || "unknown",
        severity:
          d.severity === vscode.DiagnosticSeverity.Error ? "CRITICAL" : "HIGH", // approximate or map back
        message: d.message,
        offendingText,
        loc: {
          line: range.start.line + 1,
          column: range.start.character + 1,
          index,
        },
        readableLabel: undefined, // Metadata lost unless encoded
      } as ThreatReport;
    });

    this.documentThreats.set(uri.toString(), threats);
    this.updateDecorations(uri, threats);
  }

  private updateDecorations(uri: vscode.Uri, threats: ThreatReport[]) {
    const editors = vscode.window.visibleTextEditors.filter(
      (e) => e.document.uri.toString() === uri.toString(),
    );

    for (const editor of editors) {
      this._onThreatsChanged.fire(threats.length);

      const rangeDecorations: vscode.DecorationOptions[] = [];
      const eolDecorations: vscode.DecorationOptions[] = [];

      // Group by line
      const threatsByLine = new Map<number, ThreatReport[]>();
      for (const t of threats) {
        const line = t.loc.line - 1;
        if (!threatsByLine.has(line)) {
          threatsByLine.set(line, []);
        }
        threatsByLine.get(line)?.push(t);
      }

      // Create Range Decorations
      for (const t of threats) {
        const start = editor.document.positionAt(t.loc.index);
        const end = editor.document.positionAt(
          t.loc.index + t.offendingText.length,
        );

        rangeDecorations.push({
          range: new vscode.Range(start, end),
          hoverMessage: t.message,
        });
      }

      // Create EOL Decorations
      for (const [line, lineThreats] of threatsByLine) {
        // Summarize
        const categories = new Set(lineThreats.map((t) => t.category));
        const summary = Array.from(categories).join(", ");

        eolDecorations.push({
          range: new vscode.Range(line, 0, line, 0),
          renderOptions: {
            after: {
              contentText: `🛡️ ${lineThreats.length} threat(s) [${summary}]`,
            },
          },
        });
      }

      editor.setDecorations(this.rangeDecorationType, rangeDecorations);
      editor.setDecorations(this.eolDecorationType, eolDecorations);
    }

    if (
      vscode.window.activeTextEditor &&
      vscode.window.activeTextEditor.document.uri.toString() === uri.toString()
    ) {
      this._onThreatsChanged.fire(threats.length);
    }
  }
}
