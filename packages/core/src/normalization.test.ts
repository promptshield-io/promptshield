import { describe, expect, it } from "vitest";
import { scanNormalization } from "./normalization";

describe("scanNormalization", () => {
  it("should detect NFKC normalization changes", () => {
    const attack = "admin\uFF21"; // Fullwidth Latin Capital Letter A -> 'A'
    const threats = scanNormalization(attack);

    expect(threats.length).toBe(1);
    expect(threats[0].category).toBe("NORMALIZATION");
    expect(threats[0].severity).toBe("HIGH");
    expect(threats[0].message).toContain("→");
    expect(threats[0].decodedPayload).toBe("A");
    expect(threats[0].readableLabel).toBe("[NFKC_DIFF]");
  });

  it("should ignore text that is already normalized", () => {
    const safe = "adminA";
    const threats = scanNormalization(safe);
    expect(threats).toHaveLength(0);
  });

  it("should detect multiple normalization issues", () => {
    const text = "\u2163 \uFB01"; // Roman Numeral IV -> IV, 'fi' ligature -> fi
    const threats = scanNormalization(text);
    expect(threats.length).toBe(2);
  });

  it("should respect stopOnFirstThreat option", () => {
    const text = "\u2163 \uFB01"; // Roman Numeral IV, fi ligature
    const threats = scanNormalization(text, { stopOnFirstThreat: true });
    expect(threats).toHaveLength(1);
    expect(threats[0].decodedPayload).toBe("IV");
  });
});
