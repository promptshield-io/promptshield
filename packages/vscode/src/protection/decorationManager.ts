import type { ThreatReport } from "@promptshield/core";
import * as vscode from "vscode";
import { Scanner } from "./scanner";

export class DecorationManager {
  private scanner: Scanner;
  private decorationType: vscode.TextEditorDecorationType;
  private documentThreats = new Map<string, ThreatReport[]>();
  private enabled = true;

  private _onThreatsChanged = new vscode.EventEmitter<number>();
  public readonly onThreatsChanged = this._onThreatsChanged.event;

  constructor() {
    this.scanner = new Scanner();
    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor(
        "promptshield.highThreatBackground",
      ),
      overviewRulerColor: "red",
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      after: {
        color: new vscode.ThemeColor("promptshield.ghostTextForeground"),
        margin: "0 0 0 4px",
      },
    });
  }

  public getThreatsAt(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): ThreatReport[] {
    const threats = this.documentThreats.get(document.uri.toString()) || [];
    return threats.filter((t) => {
      const start = document.positionAt(t.loc.index);
      const end = document.positionAt(t.loc.index + t.offendingText.length);
      const range = new vscode.Range(start, end);
      return range.contains(position);
    });
  }

  public activate(context: vscode.ExtensionContext) {
    // Initial scan of active editor
    if (vscode.window.activeTextEditor) {
      this.refresh(vscode.window.activeTextEditor, true);
    }

    // Listeners
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.refresh(editor, true);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (
          vscode.window.activeTextEditor &&
          event.document === vscode.window.activeTextEditor.document
        ) {
          this.handleDocumentChange(event, vscode.window.activeTextEditor);
        }
      }),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.scanner.clearCache(doc.uri);
        this.documentThreats.delete(doc.uri.toString());
      }),
    );
  }

  private refresh(editor: vscode.TextEditor, fullScan = false) {
    if (fullScan) {
      if (!this.enabled) {
        console.log("PromptShield: Refresh skipped (disabled)");
        return;
      }
      const threats = this.scanner.scanDocument(editor.document);
      console.log(
        `PromptShield: Scanned document ${editor.document.uri.toString()}, found ${threats.length} threats`,
      );
      this.documentThreats.set(editor.document.uri.toString(), threats);
      this.updateDecorations(editor);
    }
  }

  public toggleXRay(): boolean {
    this.enabled = !this.enabled;
    console.log(`PromptShield: Toggled X-Ray to ${this.enabled}`);
    if (this.enabled) {
      // Trigger generic refresh for visible editors
      vscode.window.visibleTextEditors.forEach((editor) => {
        this.refresh(editor, true);
      });
    } else {
      // Clear all
      vscode.window.visibleTextEditors.forEach((editor) => {
        editor.setDecorations(this.decorationType, []);
      });
    }
    return this.enabled;
  }

  private handleDocumentChange(
    event: vscode.TextDocumentChangeEvent,
    editor: vscode.TextEditor,
  ) {
    const key = editor.document.uri.toString();
    const currentThreats = this.documentThreats.get(key) || [];

    // If too many changes, fallback to full scan
    if (event.contentChanges.length > 10) {
      this.refresh(editor, true);
      return;
    }

    let newThreats = [...currentThreats];

    // Process changes from bottom to top to avoid offset shifting issues during the process
    const sortedChanges = [...event.contentChanges].sort(
      (a, b) => b.rangeOffset - a.rangeOffset,
    );

    for (const change of sortedChanges) {
      const changeStart = change.rangeOffset;
      const changeEnd = change.rangeOffset + change.rangeLength;
      const delta = change.text.length - change.rangeLength;

      // 1. Remove threats in overlap
      newThreats = newThreats.filter((t) => {
        const tStart = t.loc.index;
        const tLen = t.offendingText.length;
        const tEndComputed = tStart + tLen;
        return !(tStart < changeEnd && tEndComputed > changeStart);
      });

      // 2. Scan new text
      const fragmentThreats = this.scanner.scanRange(change.text);
      const addedThreats = fragmentThreats.map((ft) => ({
        ...ft,
        loc: {
          ...ft.loc,
          index: ft.loc.index + changeStart,
        },
      }));

      newThreats.push(...addedThreats);

      // 3. Shift threats AFTER this change (which are located strictly after the insertion point)
      for (const t of newThreats) {
        if (t.loc.index >= changeEnd) {
          t.loc.index += delta;
        }
      }
    }

    this.documentThreats.set(key, newThreats);
    this.updateDecorations(editor);
  }

  private updateDecorations(editor: vscode.TextEditor) {
    if (!this.enabled) {
      editor.setDecorations(this.decorationType, []);
      this._onThreatsChanged.fire(0);
      return;
    }
    const threats =
      this.documentThreats.get(editor.document.uri.toString()) || [];

    console.log(
      `PromptShield: Updating decorations for ${editor.document.uri.toString()}, threats: ${threats.length}`,
    );
    this._onThreatsChanged.fire(threats.length);
    const decorations: vscode.DecorationOptions[] = [];

    for (const t of threats) {
      if (!t.offendingText) continue;
      // t.loc.index is absolute
      const startPos = editor.document.positionAt(t.loc.index);
      const endPos = editor.document.positionAt(
        t.loc.index + t.offendingText.length,
      );
      const range = new vscode.Range(startPos, endPos);

      const message = `Detected: ${t.category} (${t.readableLabel || "THREAT"})`;

      decorations.push({
        range,
        hoverMessage: message,
        renderOptions: {
          after: {
            contentText: t.readableLabel || `[${t.category}]`,
          },
        },
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }
}
