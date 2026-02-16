import type { ThreatReport } from "@promptshield/core";
import { applyFixes } from "@promptshield/sanitizer";
import {
  type CodeAction,
  CodeActionKind,
  Range,
  TextEdit,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";

/**
 * Compute a minimal edit between original and updated text.
 */
const computeMinimalEdit = (
  document: TextDocument,
  original: string,
  updated: string,
): TextEdit | null => {
  if (original === updated) return null;

  let start = 0;

  while (
    start < original.length &&
    start < updated.length &&
    original[start] === updated[start]
  ) {
    start++;
  }

  let endOriginal = original.length - 1;
  let endUpdated = updated.length - 1;

  while (
    endOriginal >= start &&
    endUpdated >= start &&
    original[endOriginal] === updated[endUpdated]
  ) {
    endOriginal--;
    endUpdated--;
  }

  const range = Range.create(
    document.positionAt(start),
    document.positionAt(endOriginal + 1),
  );

  const newText = updated.slice(start, endUpdated + 1);

  return TextEdit.replace(range, newText);
};

/**
 * Create "Fix all issues" code action.
 */
export const getFixAllAction = (
  document: TextDocument,
  threats: ThreatReport[],
): CodeAction | null => {
  if (threats.length === 0) return null;

  const original = document.getText();
  const result = applyFixes(original, threats);

  const edit = computeMinimalEdit(document, original, result.text);
  if (!edit) return null;

  return {
    title: "PromptShield: Fix all issues in file",
    kind: CodeActionKind.QuickFix,
    isPreferred: true,
    edit: { changes: { [document.uri]: [edit] } },
  };
};

/**
 * Create per-threat quick fixes.
 */
export const getThreatFixActions = (
  document: TextDocument,
  threats: ThreatReport[],
): CodeAction[] => {
  const original = document.getText();

  return threats.flatMap((threat) => {
    const result = applyFixes(original, [threat]);
    const edit = computeMinimalEdit(document, original, result.text);

    if (!edit) return [];

    return [
      {
        title: `PromptShield: Fix ${threat.category}`,
        kind: CodeActionKind.QuickFix,
        edit: { changes: { [document.uri]: [edit] } },
      },
    ];
  });
};
