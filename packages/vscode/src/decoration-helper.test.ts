/** biome-ignore-all lint/suspicious/noExplicitAny: test file */

import { describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import { createHoverMessageAndLabel } from "./decoration-helper";

// Mocks
const mocks = vi.hoisted(() => {
  class MockMarkdownString {
    isTrusted = false;
    supportThemeIcons = false;
    constructor(public value: string = "") {}
    appendMarkdown(val: string) {
      this.value += val;
    }
  }

  return {
    MockMarkdownString,
  };
});

vi.mock("vscode", () => ({
  MarkdownString: mocks.MockMarkdownString,
}));

describe("decoration-helper", () => {
  describe("createHoverMessageAndLabel", () => {
    it("should return the correct label and hover message for unused ignores", () => {
      const mockDiagnostic = {
        message: "Unused promptshield-ignore directive",
      } as vscode.Diagnostic;

      const result = createHoverMessageAndLabel(mockDiagnostic, true);

      expect(result.label).toBe("Unused `promptshield-ignore` directive");
      expect((result.hoverMessage as any).value).toContain(
        "PromptShield: Unused Ignore Directive",
      );
      expect((result.hoverMessage as any).value).toContain(
        "Warning:** Leaving unused ignore directives in your code",
      );
      expect((result.hoverMessage as any).isTrusted).toBe(true);
      expect((result.hoverMessage as any).supportThemeIcons).toBe(true);
    });

    it("should return the correct label and hover message for critical severity visual threats", () => {
      const mockDiagnostic = {
        message: "General diagnostic message",
        data: [
          {
            category: "INVISIBLE_CHAR",
            ruleId: "inv-1",
            severity: "CRITICAL",
            message: "Contains invisible character",
            referenceUrl: "https://example.com/inv-1",
            readableLabel: "Zero Width Space",
            offendingText: "\u200B",
            decodedPayload: "ZWS",
          },
        ],
      } as unknown as vscode.Diagnostic;

      const result = createHoverMessageAndLabel(mockDiagnostic, false);

      expect(result.label).toBe("General diagnostic message");
      const hoverValue = (result.hoverMessage as any).value;
      expect(hoverValue).toContain(
        "### $(alert) PromptShield: INVISIBLE_CHAR (inv-1)",
      );
      expect(hoverValue).toContain("**Severity:** `CRITICAL`");
      expect(hoverValue).toContain("Contains invisible character");
      expect(hoverValue).toContain(
        "[$(book) Learn more](https://example.com/inv-1)",
      );
      expect(hoverValue).toContain(
        "*Invisible/Obfuscated Text:* `Zero Width Space`",
      );
      expect(hoverValue).toContain("*Offending Text:* `\u200B`");
      expect(hoverValue).toContain("*Decoded Payload:* `ZWS`");
    });

    it("should return the correct label and hover message for low severity non-visual threats", () => {
      const mockDiagnostic = {
        message: "General diagnostic message",
        data: [
          {
            category: "PROMPT_INJECTION",
            ruleId: "inj-1",
            severity: "LOW",
            message: "Detected potential injection",
            referenceUrl: "https://example.com/inj-1",
            offendingText: "Ignore previous instructions",
          },
        ],
      } as unknown as vscode.Diagnostic;

      const result = createHoverMessageAndLabel(mockDiagnostic, false);

      expect(result.label).toBe("General diagnostic message");
      const hoverValue = (result.hoverMessage as any).value;
      expect(hoverValue).toContain(
        "### $(shield) PromptShield: PROMPT_INJECTION (inj-1)",
      );
      expect(hoverValue).toContain("**Severity:** `LOW`");
      expect(hoverValue).toContain("Detected potential injection");
      expect(hoverValue).toContain(
        "[$(book) Learn more](https://example.com/inj-1)",
      );
      expect(hoverValue).toContain(
        "*Offending Text:* `Ignore previous instructions`",
      );

      // Should not contain visual checks
      expect(hoverValue).not.toContain("*Invisible/Obfuscated Text:*");
      expect(hoverValue).not.toContain("*Decoded Payload:*");
    });

    it("should handle an empty diagnostic data array", () => {
      const mockDiagnostic = {
        message: "General diagnostic message",
        data: [],
      } as unknown as vscode.Diagnostic;

      const result = createHoverMessageAndLabel(mockDiagnostic, false);
      expect(result.label).toBe("General diagnostic message");
      expect((result.hoverMessage as any).value).toBe("");
    });

    it("should handle undefined diagnostic data array safely", () => {
      const mockDiagnostic = {
        message: "General diagnostic message",
      } as unknown as vscode.Diagnostic;

      const result = createHoverMessageAndLabel(mockDiagnostic, false);
      expect(result.label).toBe("General diagnostic message");
      expect((result.hoverMessage as any).value).toBe("");
    });
  });
});
