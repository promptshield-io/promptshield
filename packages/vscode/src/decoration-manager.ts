import type { ThreatReport } from "@promptshield/core";
import * as vscode from "vscode";

export class DecorationManager {
  private criticalDecorationType: vscode.TextEditorDecorationType;
  private highDecorationType: vscode.TextEditorDecorationType;
  private mediumDecorationType: vscode.TextEditorDecorationType;
  private lowDecorationType: vscode.TextEditorDecorationType;
  private hiddenTextDecorationType: vscode.TextEditorDecorationType;
  private eolDecorationType: vscode.TextEditorDecorationType;
  private documentThreats = new Map<string, ThreatReport[]>();

  private _onThreatsChanged = new vscode.EventEmitter<number>();
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

    this.hiddenTextDecorationType =
      vscode.window.createTextEditorDecorationType({
        color: "transparent",
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
      if (
        (d as unknown as { data: ThreatReport }).data &&
        d.code !== undefined
      ) {
        return (d as unknown as { data: ThreatReport }).data;
      }

      // Fallback: Reconstruct ThreatReport from Diagnostic
      const range = d.range;
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
        ruleId: String(d.code) || "unknown", // mapped from category
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

      const criticalDecorations: vscode.DecorationOptions[] = [];
      const highDecorations: vscode.DecorationOptions[] = [];
      const mediumDecorations: vscode.DecorationOptions[] = [];
      const lowDecorations: vscode.DecorationOptions[] = [];
      const hiddenDecorations: vscode.DecorationOptions[] = [];
      const eolDecorations: vscode.DecorationOptions[] = [];

      // Group threats by range (start:end) to deduplicate decorations
      const threatsByRange = new Map<string, ThreatReport[]>();
      for (const t of threats) {
        const key = `${t.loc.index}:${t.loc.index + t.offendingText.length}`;
        if (!threatsByRange.has(key)) {
          threatsByRange.set(key, []);
        }
        threatsByRange.get(key)?.push(t);
      }

      // Create Range Decorations
      for (const [, rangeThreats] of threatsByRange) {
        // Pick the "worst" threat to determine color
        let maxSeverity: ThreatReport["severity"] = "LOW";
        // Simple mapping for comparison
        const severityScore = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

        let primaryThreat: ThreatReport = rangeThreats[0];

        // Combine messages into rich hover
        const messages = rangeThreats
          .map((t) => {
            const icon =
              t.severity === "CRITICAL" || t.severity === "HIGH"
                ? "$(alert)"
                : "$(shield)";
            return `### ${icon} PromptShield Threat Detected\n\n**Category:** ${t.category}\n**Severity:** ${t.severity}\n\n${t.message}\n\n**Offending Text:** \`${t.offendingText}\`${t.decodedPayload ? `\n\n**Decoded Payload:** \`${t.decodedPayload}\`` : ""}`;
          })
          .join("\n\n---\n\n");

        const hoverMessage = new vscode.MarkdownString(messages);
        hoverMessage.isTrusted = true;
        hoverMessage.supportThemeIcons = true;

        for (const t of rangeThreats) {
          if (severityScore[t.severity] > severityScore[maxSeverity]) {
            maxSeverity = t.severity;
            primaryThreat = t;
          }
        }

        const start = editor.document.positionAt(primaryThreat.loc.index);
        const end = editor.document.positionAt(
          primaryThreat.loc.index + primaryThreat.offendingText.length,
        );

        // Check if the threat consists entirely of invisible/whitespace characters/payloads
        // that should be "replaced" by the label.
        // Regex checks for NO "Graphic" characters (Letters, Numbers, Punctuation, Symbols, Marks).
        // Actually simpler: check if it matches *only* Control (C), Separator (Z), or Other (C/Z/Format).
        // If it has a payload, we usually want to show the payload instead of the invisible text.

        // We consider "Replaceable" if it contains characters that are typically invisible or just whitespace.
        // Use a broad check for "Graphic" characters. If any graphic char exists, we don't replace.
        // \P{C} means "Not Control". \P{Z} means "Not Separator".
        // Use negation: Is there any char that is NOT (Control OR Separator)?
        // If yes, it's printable -> Show as is.
        // If no, it's invisible/whitespace -> Replace with code.
        const isReplaceable = !/[^\p{C}\p{Z}]/u.test(
          primaryThreat.offendingText,
        );

        const decoration: vscode.DecorationOptions = {
          range: new vscode.Range(start, end),
          hoverMessage,
        };

        if (isReplaceable) {
          // Invisible/Whitespace -> Replace with Label "In Place"

          // 1. Determine Label
          const threatWithPayload =
            rangeThreats.find((t) => t.decodedPayload) || primaryThreat;
          let label = "";

          if (threatWithPayload.decodedPayload) {
            label = `[${threatWithPayload.decodedPayload}]`;
          } else {
            // Hex codes
            const hexCodes = Array.from(primaryThreat.offendingText)
              .map(
                (c) =>
                  `U+${c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`,
              )
              .join(" ");
            label = `[${hexCodes}]`;
          }

          // 2. Determine Background Color for Label
          let backgroundColorName = "promptshield.lowThreatBackground";
          if (maxSeverity === "CRITICAL") {
            backgroundColorName = "promptshield.criticalThreatBackground";
          } else if (maxSeverity === "HIGH") {
            backgroundColorName = "promptshield.highThreatBackground";
          } else if (maxSeverity === "MEDIUM") {
            backgroundColorName = "promptshield.mediumThreatBackground";
          }

          // 3. Create Hidden Decoration with Styled Label
          hiddenDecorations.push({
            range: new vscode.Range(start, end),
            renderOptions: {
              before: {
                contentText: label,
                backgroundColor: new vscode.ThemeColor(backgroundColorName),
                color: new vscode.ThemeColor(
                  "promptshield.ghostTextForeground",
                ),
                margin: "0 4px 0 0",
                fontStyle: "normal",
                fontWeight: "bold",
              },
            },
          });
        }
        // Else: Visible -> No label, no hiding.

        // Apply background color via the correct bucket
        if (maxSeverity === "CRITICAL") {
          criticalDecorations.push(decoration);
        } else if (maxSeverity === "HIGH") {
          highDecorations.push(decoration);
        } else if (maxSeverity === "MEDIUM") {
          mediumDecorations.push(decoration);
        } else {
          lowDecorations.push(decoration);
        }
      }

      // Group by line for EOL decorations
      const threatsByLine = new Map<number, ThreatReport[]>();
      for (const t of threats) {
        const line = t.loc.line - 1;
        if (!threatsByLine.has(line)) {
          threatsByLine.set(line, []);
        }
        threatsByLine.get(line)?.push(t);
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

      editor.setDecorations(this.criticalDecorationType, criticalDecorations);
      editor.setDecorations(this.highDecorationType, highDecorations);
      editor.setDecorations(this.mediumDecorationType, mediumDecorations);
      editor.setDecorations(this.lowDecorationType, lowDecorations);
      editor.setDecorations(this.hiddenTextDecorationType, hiddenDecorations);
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
