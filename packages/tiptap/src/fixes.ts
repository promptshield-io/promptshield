import { ThreatCategory, type ThreatReport } from "@promptshield/core";
import type { Editor } from "@tiptap/core";
import { extractTextAndMapping, mapTextIndexToPmPos } from "./utils";

/**
 * Check if a threat can be automatically fixed.
 */
export const canFixThreat = (threat: ThreatReport): boolean => {
  if (threat.category === ThreatCategory.Smuggling) {
    return (
      threat.ruleId === "PSS003" || // Hidden Comment
      threat.ruleId === "PSS004" || // Empty Link
      threat.readableLabel === "[Hidden Comment]" ||
      threat.readableLabel === "[Empty Link]"
    );
  }

  return [
    ThreatCategory.Invisible,
    ThreatCategory.Trojan,
    ThreatCategory.Normalization,
  ].includes(threat.category);
};

export const applyFixToEditor = (editor: Editor, threat: ThreatReport) => {
  const { state, view } = editor;
  const { tr, doc } = state;

  // We need to map the threat index back to the current document state
  // to ensure positions are correct right before we apply the transaction
  const { mapping } = extractTextAndMapping(doc);
  const pmStart = mapTextIndexToPmPos(threat.range.start.index, mapping);

  if (pmStart === null) return false;

  const pmEnd = pmStart + (threat.offendingText?.length || 0);

  let applied = false;

  switch (threat.category) {
    case ThreatCategory.Invisible:
    case ThreatCategory.Trojan:
      // Remove the offending characters
      tr.delete(pmStart, pmEnd);
      applied = true;
      break;

    case ThreatCategory.Smuggling:
      if (
        threat.readableLabel === "[Hidden Comment]" ||
        threat.readableLabel === "[Empty Link]"
      ) {
        tr.delete(pmStart, pmEnd);
        applied = true;
      }
      break;

    case ThreatCategory.Normalization:
      // Replace with normalized text
      if (threat.offendingText) {
        tr.insertText(threat.offendingText.normalize("NFKC"), pmStart, pmEnd);
        applied = true;
      }
      break;
  }

  if (applied) {
    view.dispatch(tr);
  }

  return applied;
};

export const applyAllFixesToEditor = (editor: Editor) => {
  const { state, view } = editor;
  const { doc } = state;

  // 1. Get current threats from storage
  const storage = editor.storage.promptshield;
  if (!storage?.threats || storage.threats.length === 0) return false;

  const threats = storage.threats as ThreatReport[];

  // 2. Extract text
  const { text } = extractTextAndMapping(doc);

  // 3. Apply all fixes using @promptshield/sanitizer
  // We use the sanitizer directly to get the fixed text
  const { applyFixes } = require("@promptshield/sanitizer");
  const result = applyFixes(text, threats);

  if (result.text === text) return false;

  // 4. Replace entire document content with fixed text
  // Simple approach: replace the whole doc text.
  // Better: use a transaction that replaces the relevant spans if possible,
  // but for "Fix All", a full text replacement (while preserving marks if we were careful)
  // is often easiest if the entire doc is basically text.
  // However, TipTap has many nodes. Replacing text might lose structure.

  // A safer way is to apply fixes one by one in reverse order to keep positions valid.
  const sortedThreats = [...threats].sort(
    (a, b) => b.range.start.index - a.range.start.index,
  );
  const tr = state.tr;
  let applied = false;

  for (const threat of sortedThreats) {
    const { mapping: currentMapping } = extractTextAndMapping(tr.doc);
    const pmStart = mapTextIndexToPmPos(
      threat.range.start.index,
      currentMapping,
    );
    if (pmStart === null) continue;

    const pmEnd = pmStart + (threat.offendingText?.length || 0);

    switch (threat.category) {
      case ThreatCategory.Invisible:
      case ThreatCategory.Trojan:
        tr.delete(pmStart, pmEnd);
        applied = true;
        break;
      case ThreatCategory.Normalization:
        if (threat.offendingText) {
          tr.insertText(threat.offendingText.normalize("NFKC"), pmStart, pmEnd);
          applied = true;
        }
        break;
      // Add other categories as needed...
    }
  }

  if (applied) {
    view.dispatch(tr);
  }

  return applied;
};
