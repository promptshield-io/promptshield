import type { ThreatReport } from "@promptshield/core";
import { SOURCE, UNUSED_DIRECTIVE_CODE } from "@promptshield/lsp";
import * as vscode from "vscode";
import { createHoverMessageAndLabel } from "./decoration-helper";

export class DecorationManager implements vscode.Disposable {
  private criticalDecorationType: vscode.TextEditorDecorationType;
  private highDecorationType: vscode.TextEditorDecorationType;
  private mediumDecorationType: vscode.TextEditorDecorationType;
  private lowDecorationType: vscode.TextEditorDecorationType;
  private criticalReplacementDecorationType: vscode.TextEditorDecorationType;
  private highReplacementDecorationType: vscode.TextEditorDecorationType;
  private mediumReplacementDecorationType: vscode.TextEditorDecorationType;
  private lowReplacementDecorationType: vscode.TextEditorDecorationType;
  private eolDecorationType: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];
  private isXRayEnabled = false;

  private _onThreatsChanged = new vscode.EventEmitter<{
    count: number;
  }>();
  public readonly onThreatsChanged = this._onThreatsChanged.event;

  constructor() {
    // Shared properties for range decorations
    const baseRangeOptions: vscode.DecorationRenderOptions = {
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    };

    this.criticalDecorationType = vscode.window.createTextEditorDecorationType({
      ...baseRangeOptions,
      textDecoration:
        "underline wavy var(--vscode-promptshield-criticalThreatForeground)",
      overviewRulerColor: new vscode.ThemeColor(
        "promptshield.criticalThreatForeground",
      ),
      backgroundColor: new vscode.ThemeColor(
        "promptshield.criticalThreatBackground",
      ),
    });

    this.highDecorationType = vscode.window.createTextEditorDecorationType({
      ...baseRangeOptions,
      textDecoration:
        "underline wavy var(--vscode-promptshield-highThreatForeground)",
      overviewRulerColor: new vscode.ThemeColor(
        "promptshield.highThreatForeground",
      ),
      backgroundColor: new vscode.ThemeColor(
        "promptshield.highThreatBackground",
      ),
    });

    this.mediumDecorationType = vscode.window.createTextEditorDecorationType({
      ...baseRangeOptions,
      textDecoration:
        "underline wavy var(--vscode-promptshield-mediumThreatForeground)",
      overviewRulerColor: new vscode.ThemeColor(
        "promptshield.mediumThreatForeground",
      ),
      backgroundColor: new vscode.ThemeColor(
        "promptshield.mediumThreatBackground",
      ),
    });

    this.lowDecorationType = vscode.window.createTextEditorDecorationType({
      ...baseRangeOptions,
      textDecoration:
        "underline wavy var(--vscode-promptshield-lowThreatForeground)",
      overviewRulerColor: new vscode.ThemeColor(
        "promptshield.lowThreatForeground",
      ),
      backgroundColor: new vscode.ThemeColor(
        "promptshield.lowThreatBackground",
      ),
    });

    const baseReplacementBeforeOptions = {
      color: new vscode.ThemeColor("promptshield.ghostTextForeground"),
      fontStyle: "normal",
      fontWeight: "bold",
    };

    this.criticalReplacementDecorationType =
      vscode.window.createTextEditorDecorationType({
        before: {
          ...baseReplacementBeforeOptions,
          backgroundColor: new vscode.ThemeColor(
            "promptshield.criticalThreatBackground",
          ),
          textDecoration:
            "underline wavy var(--vscode-promptshield-criticalThreatBackground)",
        },
      });

    this.highReplacementDecorationType =
      vscode.window.createTextEditorDecorationType({
        before: {
          ...baseReplacementBeforeOptions,
          backgroundColor: new vscode.ThemeColor(
            "promptshield.highThreatBackground",
          ),
          textDecoration:
            "underline wavy var(--vscode-promptshield-highThreatBackground)",
        },
      });

    this.mediumReplacementDecorationType =
      vscode.window.createTextEditorDecorationType({
        before: {
          ...baseReplacementBeforeOptions,
          backgroundColor: new vscode.ThemeColor(
            "promptshield.mediumThreatBackground",
          ),
          textDecoration:
            "underline wavy var(--vscode-promptshield-mediumThreatBackground)",
        },
      });

    this.lowReplacementDecorationType =
      vscode.window.createTextEditorDecorationType({
        before: {
          ...baseReplacementBeforeOptions,
          backgroundColor: new vscode.ThemeColor(
            "promptshield.lowThreatBackground",
          ),
          textDecoration:
            "underline wavy var(--vscode-promptshield-lowThreatBackground)",
        },
      });

    this.eolDecorationType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      after: {
        color: new vscode.ThemeColor("promptshield.ghostTextForeground"),
        margin: "0 0 0 20px",
      },
    });

    // Track all decoration types for disposal
    this.disposables.push(
      this.criticalDecorationType,
      this.highDecorationType,
      this.mediumDecorationType,
      this.lowDecorationType,
      this.criticalReplacementDecorationType,
      this.highReplacementDecorationType,
      this.mediumReplacementDecorationType,
      this.lowReplacementDecorationType,
      this.eolDecorationType,
      this._onThreatsChanged,
    );
  }

  public dispose() {
    this.disposables.forEach((d) => {
      d.dispose();
    });
  }

  public toggleXRay() {
    this.isXRayEnabled = !this.isXRayEnabled;
    // Re-render decorations for all visible editors
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateFromDiagnostics(editor.document.uri);
    }
  }

  public activate() {
    // Listen for diagnostics changes
    const diagnosticsListener = vscode.languages.onDidChangeDiagnostics((e) => {
      for (const uri of e.uris) {
        this.updateFromDiagnostics(uri);
      }
    });

    // Also update on active editor change to ensure decorations are visible/refreshed
    const editorListener = vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor) {
          this.updateFromDiagnostics(editor.document.uri);
        }
      },
    );

    this.disposables.push(diagnosticsListener, editorListener);

    // Initial update for active editor
    if (vscode.window.activeTextEditor) {
      this.updateFromDiagnostics(vscode.window.activeTextEditor.document.uri);
    }
  }

  private updateFromDiagnostics(uri: vscode.Uri) {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    const promptShieldDiagnostics = diagnostics.filter(
      (d) => d.source === SOURCE,
    );

    this.updateDecorations(uri, promptShieldDiagnostics);
  }

  private updateDecorations(
    uri: vscode.Uri,
    diagnostics: readonly vscode.Diagnostic[],
  ) {
    const editors = vscode.window.visibleTextEditors.filter(
      (e) => e.document.uri.toString() === uri.toString(),
    );

    for (const editor of editors) {
      this._onThreatsChanged.fire({
        count: diagnostics.length,
      });

      const criticalDecorations: vscode.DecorationOptions[] = [];
      const highDecorations: vscode.DecorationOptions[] = [];
      const mediumDecorations: vscode.DecorationOptions[] = [];
      const lowDecorations: vscode.DecorationOptions[] = [];
      const criticalReplacementDecorations: vscode.DecorationOptions[] = [];
      const highReplacementDecorations: vscode.DecorationOptions[] = [];
      const mediumReplacementDecorations: vscode.DecorationOptions[] = [];
      const lowReplacementDecorations: vscode.DecorationOptions[] = [];
      const eolDecorations: vscode.DecorationOptions[] = [];

      for (const diagnostic of diagnostics) {
        const rangeThreats = (diagnostic as unknown as { data: ThreatReport[] })
          .data;

        const isUnusedIgnore = diagnostic.code === UNUSED_DIRECTIVE_CODE;

        if (!isUnusedIgnore && !rangeThreats?.length) {
          continue;
        }

        const primaryThreat = rangeThreats?.[0];

        const start = diagnostic.range.start;
        const end = diagnostic.range.end;

        const { hoverMessage } = createHoverMessageAndLabel(
          diagnostic,
          isUnusedIgnore,
        );

        const decoration: vscode.DecorationOptions = {
          range: diagnostic.range,
          hoverMessage,
        };

        let replacementDecoration: vscode.DecorationOptions | undefined;
        if (this.isXRayEnabled && primaryThreat?.readableLabel) {
          replacementDecoration = {
            range: new vscode.Range(start, end),
            renderOptions: {
              before: { contentText: primaryThreat.readableLabel },
            },
            hoverMessage,
          };
        }

        // Apply background color via the correct bucket
        switch (diagnostic.severity) {
          case vscode.DiagnosticSeverity.Error:
            criticalDecorations.push(decoration);
            if (replacementDecoration)
              criticalReplacementDecorations.push(replacementDecoration);
            break;
          case vscode.DiagnosticSeverity.Warning:
            highDecorations.push(decoration);
            if (replacementDecoration)
              highReplacementDecorations.push(replacementDecoration);
            break;
          case vscode.DiagnosticSeverity.Information:
            mediumDecorations.push(decoration);
            if (replacementDecoration)
              mediumReplacementDecorations.push(replacementDecoration);
            break;
          case vscode.DiagnosticSeverity.Hint:
            lowDecorations.push(decoration);
            if (replacementDecoration)
              lowReplacementDecorations.push(replacementDecoration);
            break;
        }
      }

      // Group by line for EOL decorations
      const groupsByLine = new Map<number, ThreatReport[][]>();
      for (const diagnostic of diagnostics) {
        const g = (diagnostic as unknown as { data: ThreatReport[] }).data;
        if (!g || g.length === 0) continue;
        const line = diagnostic.range.start.line;
        if (!groupsByLine.has(line)) {
          groupsByLine.set(line, []);
        }
        groupsByLine.get(line)?.push(g);
      }

      // Create EOL Decorations
      for (const [line, lineGroups] of groupsByLine) {
        // Summarize
        const categories = new Set(
          lineGroups.flatMap((g) => g.map((t) => t.category)),
        );
        const summary = Array.from(categories).join(", ");
        const threatCount = lineGroups.length;

        eolDecorations.push({
          range: new vscode.Range(line, 0, line, 0),
          renderOptions: {
            after: {
              contentText: `🛡️ ${threatCount} threat(s) [${summary}]`,
            },
          },
        });
      }

      editor.setDecorations(this.criticalDecorationType, criticalDecorations);
      editor.setDecorations(this.highDecorationType, highDecorations);
      editor.setDecorations(this.mediumDecorationType, mediumDecorations);
      editor.setDecorations(this.lowDecorationType, lowDecorations);
      editor.setDecorations(
        this.criticalReplacementDecorationType,
        criticalReplacementDecorations,
      );
      editor.setDecorations(
        this.highReplacementDecorationType,
        highReplacementDecorations,
      );
      editor.setDecorations(
        this.mediumReplacementDecorationType,
        mediumReplacementDecorations,
      );
      editor.setDecorations(
        this.lowReplacementDecorationType,
        lowReplacementDecorations,
      );
      editor.setDecorations(this.eolDecorationType, eolDecorations);
    }

    if (
      vscode.window.activeTextEditor &&
      vscode.window.activeTextEditor.document.uri.toString() === uri.toString()
    ) {
      this._onThreatsChanged.fire({
        count: diagnostics.length,
      });
    } else if (!vscode.window.activeTextEditor) {
      this._onThreatsChanged.fire({ count: 0 });
    }
  }
}
