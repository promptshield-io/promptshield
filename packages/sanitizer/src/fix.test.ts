import { ThreatCategory, type ThreatReport } from "@promptshield/core";
import { describe, expect, it } from "vitest";
import { applyFixes } from "./fix";

// Helper to create a minimal ThreatReport
const createThreat = (
  category: ThreatCategory,
  offendingText: string,
  index: number,
  readableLabel: string = "test",
): ThreatReport => ({
  ruleId: "TEST001",
  category,
  severity: "HIGH",
  message: "Test threat",
  loc: { line: 1, column: index + 1, index },
  offendingText,
  readableLabel,
});

describe("applyFixes", () => {
  it("should return text unchanged if no threats", () => {
    const text = "Hello World";
    const result = applyFixes(text, []);
    expect(result.text).toBe(text);
    expect(result.fixed).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  describe("Invisible Characters", () => {
    it("should remove invisible characters", () => {
      const text = "H\u200Bello"; // H + ZWSP + ello
      const threat = createThreat(ThreatCategory.Invisible, "\u200B", 1);

      const result = applyFixes(text, [threat]);

      expect(result.text).toBe("Hello");
      expect(result.fixed).toHaveLength(1);
      expect(result.fixed[0]).toBe(threat);
    });
  });

  describe("Trojan Source", () => {
    it("should remove BIDI control characters", () => {
      const text = "User\u202EAdmin"; // User + RLO + Admin
      const threat = createThreat(ThreatCategory.Trojan, "\u202E", 4);

      const result = applyFixes(text, [threat]);

      expect(result.text).toBe("UserAdmin");
      expect(result.fixed).toHaveLength(1);
    });
  });

  describe("Smuggling", () => {
    it("should remove Hidden Markdown Comments", () => {
      const text = "A<!-- B -->C";
      const threat = createThreat(
        ThreatCategory.Smuggling,
        "<!-- B -->",
        1,
        "[Hidden Comment]",
      );

      const result = applyFixes(text, [threat]);

      expect(result.text).toBe("AC");
      expect(result.fixed).toHaveLength(1);
    });

    it("should remove Empty Markdown Links", () => {
      const text = "A[](http://x)C";
      const threat = createThreat(
        ThreatCategory.Smuggling,
        "[](http://x)",
        1,
        "[Empty Link]",
      );

      const result = applyFixes(text, [threat]);

      expect(result.text).toBe("AC");
      expect(result.fixed).toHaveLength(1);
    });

    it("should skip Base64 payloads (unsafe to autorecover)", () => {
      const text = "Execute: VGhpcyBpcyBiYWQ=";
      const threat = createThreat(
        ThreatCategory.Smuggling,
        "VGhpcyBpcyBiYWQ=",
        9,
        "[Base64]: ...",
      );

      const result = applyFixes(text, [threat]);

      expect(result.text).toBe(text);
      expect(result.fixed).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toBe(threat);
    });
  });

  describe("Normalization", () => {
    it("should normalize characters to NFKC form", () => {
      const text = "Office \uFB01"; // 'fi' ligature
      const threat = createThreat(ThreatCategory.Normalization, "\uFB01", 7);

      const result = applyFixes(text, [threat]);

      expect(result.text).toBe("Office fi");
      expect(result.fixed).toHaveLength(1);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle multiple threats (applying from end to start)", () => {
      // "H" (0) + ZWSP (1) + "e" (2) + RLO (3) + "l" (4)
      const text = "H\u200Be\u202El";

      const t1 = createThreat(ThreatCategory.Invisible, "\u200B", 1);
      const t2 = createThreat(ThreatCategory.Trojan, "\u202E", 3);

      // Pass in wrong order to verify sorting
      const result = applyFixes(text, [t1, t2]);

      expect(result.text).toBe("Hel");
      expect(result.fixed).toHaveLength(2);
      // Logic sorts descending by index, so RLO (index 3) is processed first, then ZWSP (index 1)
      expect(result.fixed[0]).toBe(t2); // RLO
      expect(result.fixed[1]).toBe(t1); // ZWSP
    });

    it("should skip unknown categories", () => {
      const text = "Bad";
      const threat = createThreat(ThreatCategory.Injection, "Bad", 0);

      const result = applyFixes(text, [threat]);

      expect(result.text).toBe("Bad");
      expect(result.skipped).toHaveLength(1);
    });

    it("should handle mixed fixed and skipped threats", () => {
      const text = "H\u200Bello Base64";
      const t1 = createThreat(ThreatCategory.Invisible, "\u200B", 1);
      const t2 = createThreat(
        ThreatCategory.Smuggling,
        "Base64",
        7,
        "[Base64]: ...",
      ); // Should skip

      const result = applyFixes(text, [t1, t2]);

      expect(result.text).toBe("Hello Base64");
      expect(result.fixed).toHaveLength(1); // ZWSP fixed
      expect(result.skipped).toHaveLength(1); // Base64 skipped
    });
  });
});
