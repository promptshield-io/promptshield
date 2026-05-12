/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { ThreatCategory } from "@promptshield/core";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { describe, expect, test, vi } from "vitest";
import { applyAllFixesToEditor, applyFixToEditor } from "./fixes";

// Mock sanitizer since it might not be built/linked in the test environment correctly
vi.mock("@promptshield/sanitizer", () => ({
  applyFixes: vi.fn((text, threats) => {
    if (threats.length === 0) return { text };
    return { text: `${text} fixed` }; // Dummy change to trigger the logic
  }),
}));

const createEditor = (content: string) => {
  const editor = new Editor({
    extensions: [Document, Paragraph, Text],
    content,
  });
  // Mock storage
  editor.storage.promptshield = {
    threats: [],
    threatCount: 0,
  };
  return editor;
};

describe("Tiptap Fixes", () => {
  describe("applyFixToEditor", () => {
    test("removes invisible characters", () => {
      const editor = createEditor("<p>Bad\u200BChar</p>");
      const threat = {
        category: ThreatCategory.Invisible,
        range: {
          start: { index: 3, line: 1, column: 4 },
          end: { index: 4, line: 1, column: 5 },
        },
        offendingText: "\u200B",
      } as any;

      const applied = applyFixToEditor(editor, threat);
      expect(applied).toBe(true);
      expect(editor.getText()).toBe("BadChar");
    });

    test("removes trojan source characters", () => {
      const editor = createEditor("<p>Trojan\u202EChar</p>");
      const threat = {
        category: ThreatCategory.Trojan,
        range: {
          start: { index: 6, line: 1, column: 7 },
          end: { index: 7, line: 1, column: 8 },
        },
        offendingText: "\u202E",
      } as any;

      const applied = applyFixToEditor(editor, threat);
      expect(applied).toBe(true);
      expect(editor.getText()).toBe("TrojanChar");
    });

    test("removes smuggling (hidden comment label)", () => {
      // Use something that Tiptap will actually keep in the text for testing deletion
      const editor = createEditor("<p>HiddenTHREAT</p>");
      const threat = {
        category: ThreatCategory.Smuggling,
        readableLabel: "[Hidden Comment]",
        range: {
          start: { index: 6, line: 1, column: 7 },
          end: { index: 12, line: 1, column: 13 },
        },
        offendingText: "THREAT",
      } as any;

      const applied = applyFixToEditor(editor, threat);
      expect(applied).toBe(true);
      expect(editor.getText()).toBe("Hidden");
    });

    test("normalizes text", () => {
      const editor = createEditor("<p>\u210Bello</p>"); // \u210B is SCRIPT CAPITAL H
      const threat = {
        category: ThreatCategory.Normalization,
        range: {
          start: { index: 0, line: 1, column: 1 },
          end: { index: 1, line: 1, column: 2 },
        },
        offendingText: "\u210B",
      } as any;

      const applied = applyFixToEditor(editor, threat);
      expect(applied).toBe(true);
      expect(editor.getText()).toBe("Hello");
    });
  });

  describe("applyAllFixesToEditor", () => {
    test("applies multiple fixes in reverse order", () => {
      const editor = createEditor("<p>A\u200BB\u200BC</p>");
      editor.storage.promptshield.threats = [
        {
          ruleId: "PSU001",
          severity: "LOW",
          message: "Invisible char",
          referenceUrl: "https://example.com",
          category: ThreatCategory.Invisible,
          range: {
            start: { index: 1, line: 1, column: 2 },
            end: { index: 2, line: 1, column: 3 },
          },
          offendingText: "\u200B",
        },
        {
          ruleId: "PSU001",
          severity: "LOW",
          message: "Invisible char",
          referenceUrl: "https://example.com",
          category: ThreatCategory.Invisible,
          range: {
            start: { index: 3, line: 1, column: 4 },
            end: { index: 4, line: 1, column: 5 },
          },
          offendingText: "\u200B",
        },
      ];

      const applied = applyAllFixesToEditor(editor);
      expect(applied).toBe(true);
      expect(editor.getText()).toBe("ABC");
    });

    test("handles no threats", () => {
      const editor = createEditor("<p>Clean</p>");
      editor.storage.promptshield.threats = [];
      const applied = applyAllFixesToEditor(editor);
      expect(applied).toBe(false);
    });
  });
});
