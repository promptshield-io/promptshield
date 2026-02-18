import { ThreatCategory, type ThreatReport } from "@promptshield/core";
import { describe, expect, it } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getIgnoreAction, getThreatFixActions } from "./code-actions";

const createThreat = (
  line: number,
  col: number,
  text: string,
): ThreatReport => ({
  category: ThreatCategory.Invisible,
  severity: "HIGH",
  message: "Test message",
  offendingText: text,
  loc: {
    line: line,
    column: col,
    index: 0, // Mocked, needs real offset logic if used
  },
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
});
