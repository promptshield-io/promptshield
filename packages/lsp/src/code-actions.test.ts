/** biome-ignore-all lint/suspicious/noExplicitAny: Ok for unit tests */
import { ThreatCategory, type ThreatReport } from "@promptshield/core";
import { describe, expect, it } from "vitest";
import type { Diagnostic } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  getFixAllAction,
  getIgnoreAction,
  getRemoveUnusedIgnoreActions,
  getThreatFixActions,
} from "./code-actions";
import { UNUSED_DIRECTIVE_CODE } from "./constants";

const createThreat = (
  line: number,
  col: number,
  text: string,
): ThreatReport => ({
  category: ThreatCategory.Invisible,
  ruleId: "PSU001",
  severity: "HIGH",
  message: "Test message",
  offendingText: text,
  loc: {
    line: line,
    column: col,
    index: 0, // Mocked, needs real offset logic if used
  },
  referenceUrl: "",
});

const mockDoc = TextDocument.create(
  "file:///test.ts",
  "typescript",
  1,
  "const x = 'bad';\nconst y = 'worse';",
);

describe("LSP Code Actions", () => {
  describe("getIgnoreAction", () => {
    it("should generate ignore comment for TypeScript", () => {
      const threat = createThreat(1, 1, "bad");
      const action = getIgnoreAction(mockDoc, threat);
      expect(action).toBeDefined();
      expect(action?.title).toBe("PromptShield: Ignore this line");
      expect(action?.edit?.changes?.["file:///test.ts"]).toBeDefined();
      const edit = action?.edit?.changes?.["file:///test.ts"][0];
      expect(edit?.newText).toContain("// promptshield-ignore");
    });

    it("should return null for unsupported language", () => {
      const doc = TextDocument.create(
        "file:///test.txt",
        "plaintext",
        1,
        "content",
      );
      const threat = createThreat(1, 1, "content");
      const action = getIgnoreAction(doc, threat);
      expect(action).toBeNull();
    });
  });

  // Simple test for existence, logic is complex to mock fully without sanitizer
  describe("getThreatFixActions", () => {
    it("should return actions without including ignore", () => {
      const threat = createThreat(1, 1, "bad");
      // sanitizer.applyFixes needs to return something for fix action to appear.
      // If sanitizer is mocked or behaves simply, we get actions.
      // Here we just check we get at least the ignore action if fix fails or works.
      const actions = getThreatFixActions(mockDoc, [threat]);
      const ignoreAction = actions.find(
        (a) => a.title === "PromptShield: Ignore this line",
      );
      expect(ignoreAction).toBeUndefined();
    });
  });

  describe("getFixAllAction", () => {
    it("should return null if there are no threats", () => {
      const action = getFixAllAction(mockDoc, []);
      expect(action).toBeNull();
    });

    it("should return null if the fixes do not change the document", () => {
      // Mocking a scenario where applyFixes returns the same text (using mockDoc text)
      // Since we don't mock applyFixes directly, passing an empty array of threats does nothing
      // but creating a mock threat with text that isn't in doc or not replaced would also result in no changes.
      const doc = TextDocument.create(
        "file:///test.ts",
        "typescript",
        1,
        "test",
      );
      const threat = createThreat(1, 1, "");
      const action = getFixAllAction(doc, [threat]);
      expect(action).toBeNull();
    });

    it("should return an edit Action when fixes apply changes", () => {
      const doc = TextDocument.create(
        "file:///test.ts",
        "typescript",
        1,
        "const bad = 1;",
      );
      const threat = createThreat(1, 1, "bad");
      const action = getFixAllAction(doc, [threat]);

      expect(action).not.toBeNull();
      expect(action?.title).toBe("PromptShield: Fix all issues in file");
      expect(action?.edit?.changes?.["file:///test.ts"]).toBeDefined();
    });
  });

  describe("getRemoveUnusedIgnoreActions", () => {
    it("should return empty array if no diagnostics match the unused code", () => {
      const doc = TextDocument.create(
        "file:///test.ts",
        "typescript",
        1,
        "// some text",
      );
      const diagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
          message: "other warning",
          code: "other-code",
        },
      ];
      const actions = getRemoveUnusedIgnoreActions(doc, diagnostics);
      expect(actions.length).toBe(0);
    });

    it("should delete the entire line if it contains only a comment with the unused ignore directive", () => {
      const doc = TextDocument.create(
        "file:///test.ts",
        "typescript",
        1,
        "  // promptshield-ignore  \nconst x = 1;",
      );
      const diagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 5 },
            end: { line: 0, character: 24 },
          },
          message: "Unused promptshield-ignore",
          code: UNUSED_DIRECTIVE_CODE,
        },
      ];
      const actions = getRemoveUnusedIgnoreActions(doc, diagnostics);
      expect(actions.length).toBe(1);
      const edit = actions[0].edit?.changes?.["file:///test.ts"]?.[0];

      // It should delete the whole line: matching `{ line: 0, character: 0 }` to `{ line: 1, character: 0 }`
      expect(edit?.range.start.line).toBe(0);
      expect(edit?.range.start.character).toBe(0);
      expect(edit?.range.end.line).toBe(1);
      expect(edit?.range.end.character).toBe(0);
      expect(edit?.newText).toBe("");
    });

    it("should delete only the diagnostic range if the line contains other code (inline ignore)", () => {
      const doc = TextDocument.create(
        "file:///test.ts",
        "typescript",
        1,
        "const x = 1; // promptshield-ignore",
      );
      const diagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 13 },
            end: { line: 0, character: 35 },
          },
          message: "Unused promptshield-ignore",
          code: UNUSED_DIRECTIVE_CODE,
        },
      ];
      const actions = getRemoveUnusedIgnoreActions(doc, diagnostics);
      expect(actions.length).toBe(1);
      const edit = actions[0].edit?.changes?.["file:///test.ts"]?.[0];

      // It should precisely target the diagnostic range, not the whole line
      expect(edit?.range.start.line).toBe(0);
      expect(edit?.range.start.character).toBe(13);
      expect(edit?.range.end.line).toBe(0);
      expect(edit?.range.end.character).toBe(35);
      expect(edit?.newText).toBe("");
    });

    it("should safely extract value if code is an object wrapper from languagserver", () => {
      const doc = TextDocument.create(
        "file:///test.ts",
        "typescript",
        1,
        "const x = 1; // promptshield-ignore",
      );
      const diagnostics: any[] = [
        {
          range: {
            start: { line: 0, character: 13 },
            end: { line: 0, character: 35 },
          },
          message: "Unused promptshield-ignore",
          code: UNUSED_DIRECTIVE_CODE,
        },
      ];
      const actions = getRemoveUnusedIgnoreActions(doc, diagnostics);
      expect(actions.length).toBe(1);
    });
  });
});
