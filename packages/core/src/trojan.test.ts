import { describe, expect, it } from "vitest";
import { scanTrojanSource } from "./trojan";

describe("scanTrojanSource", () => {
  it("should detect unterminated BIDI sequences (Trojan Source)", () => {
    // A classic Trojan Source vector: RLO (Right-to-Left Override) closing line
    const attack =
      "const isAdmin = false; /* \u202E } \u2066 if (isAdmin) { */";
    // Visually looks like: const isAdmin = false; /* { nimdaSi (fi { } */

    const threats = scanTrojanSource(attack);
    expect(threats.length).toBeGreaterThan(0);
    expect(threats[0].category).toBe("TROJAN_SOURCE");
    expect(threats[0].severity).toBe("CRITICAL");
  });

  it("should flag all BIDI sequences as finding", () => {
    // Valid use of BIDI in a string literal, properly closed
    const safe = 'const msg = "Hebrew: \u202Eshalom\u202C";';
    const threats = scanTrojanSource(safe);
    expect(threats).toHaveLength(1);
    expect(threats[0].readableLabel).toBe("[BIDI_OVERRIDE]");
  });

  it("should detect multiple threats in multi-line text", () => {
    const text = `
    func main() {
        var isAdmin = false
        /* \u202E } \u2066 if (isAdmin) { */
        console.log("Access granted")
        /* \u202E } \u2066 */
    }
    `;
    const threats = scanTrojanSource(text);
    expect(threats.length).toBe(2);
  });

  it("should respect stopOnFirstThreat option", () => {
    const text = `
        /* \u202E } \u2066 */
        /* \u202E } \u2066 */
    `;
    const threats = scanTrojanSource(text, { stopOnFirstThreat: true });
    expect(threats).toHaveLength(1);
  });

  it("should stop on first threat with unterminated sequences", () => {
    const text = "\u202E \n \u202E"; // Two lines with RLO
    const threats = scanTrojanSource(text, { stopOnFirstThreat: true });
    expect(threats).toHaveLength(1);
  });
});
