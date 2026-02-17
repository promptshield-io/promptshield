import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import { type Hover, MarkupKind, type Position } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";

/**
 * Provide hover information for threats at the given position.
 */
export const getHover = (
  document: TextDocument,
  position: Position,
): Hover | null => {
  const text = document.getText();
  const result = scan(text); // Optimization: rely on debounce/cache in real implementation?
  // For now, re-scan is fast (~10ms for 100kb).

  const { threats } = filterThreats(text, result.threats);

  // Find threats intersecting the position
  const activeThreats = threats.filter((t) => {
    const start = document.positionAt(t.loc.index);
    const end = document.positionAt(t.loc.index + t.offendingText.length);

    // Check if position is within [start, end)
    // using simple line/char comparison
    if (position.line < start.line || position.line > end.line) return false;
    if (position.line === start.line && position.character < start.character)
      return false;
    if (position.line === end.line && position.character >= end.character)
      return false;

    return true;
  });

  if (activeThreats.length === 0) return null;

  const contents: string[] = [];

  for (const t of activeThreats) {
    const icon =
      t.severity === "CRITICAL" || t.severity === "HIGH"
        ? "$(alert)"
        : "$(shield)";
    let md = `### ${icon} PromptShield: ${t.category}\n\n`;
    md += `**Severity:** ${t.severity}\n\n`;
    md += `${t.message}\n\n`;

    if (t.suggestion) {
      md += `**Suggestion:** ${t.suggestion}\n`;
    }

    contents.push(md);
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: contents.join("\n---\n"),
    },
  };
};
