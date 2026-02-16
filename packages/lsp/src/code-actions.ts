import type { ThreatReport } from "@promptshield/core";
import { applyFixes } from "@promptshield/sanitizer";
import {
  type CodeAction,
  CodeActionKind,
  Position,
  Range,
  TextEdit,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";

export const getFixAction = (
  document: TextDocument,
  threats: ThreatReport[],
): CodeAction | null => {
  if (threats.length === 0) return null;

  const text = document.getText();
  const { text: fixedText, fixed } = applyFixes(text, threats);

  if (fixed.length === 0 || text === fixedText) return null;

  // Replace the entire document
  // This is a simple MVP approach. Ideally we'd calculate minimal edits.
  const range = Range.create(
    Position.create(0, 0),
    document.positionAt(text.length),
  );

  const edit = TextEdit.replace(range, fixedText);

  return {
    title: "PromptShield: Fix document",
    kind: CodeActionKind.QuickFix,
    edit: {
      changes: {
        [document.uri]: [edit],
      },
    },
  };
};
