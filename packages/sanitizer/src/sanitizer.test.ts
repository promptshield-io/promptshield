import { describe, expect, it } from "vitest";
import { sanitize, sanitizeStrict } from "./index";

describe("sanitize", () => {
  it("should normalize line endings to LF", () => {
    const input = "Line1\r\nLine2\rLine3";
    const expected = "Line1\nLine2\nLine3";
    expect(sanitize(input)).toBe(expected);
  });

  it("should remove BOM", () => {
    const input = "\uFEFFHello World";
    expect(sanitize(input)).toBe("Hello World");
  });

  it("should remove invisible characters", () => {
    // ZWSP, ZWNJ, ZWJ, Word Joiner, Soft Hyphen, Hangul Filter, Halfwidth Hangul Filler, Unicode Tags
    const input =
      "H\u200Be\u200Cl\u200Dl\u2060o\u00AD \u3164W\uFFA0orld\uDB40\uDC00";
    expect(sanitize(input)).toBe("Hello World");
  });

  it("should remove variation selectors", () => {
    const input = "Character\uFE0F";
    expect(sanitize(input)).toBe("Character");
  });

  it("should remove markdown comments", () => {
    const input = "Hidden<!-- secret -->Text";
    expect(sanitize(input)).toBe("HiddenText");
  });

  it("should remove empty markdown links", () => {
    const input = "Text [](http://bad.com) Here";
    expect(sanitize(input)).toBe("Text  Here");
  });

  it("should normalize compatibility characters", () => {
    // \u00A0 (NBSP) -> space
    // \u3000 (Ideographic Space) -> space (NFKC normalizes this to space)
    const input = "No\u00A0Break\u3000Space";
    // NFKC of \u00A0 is \u0020 (space)
    // NFKC of \u3000 is \u0020 (space)
    expect(sanitize(input)).toBe("No Break Space");
  });

  it("should NOT normalize other chars in strict mode", () => {
    const input = "\uFB01le";
    expect(sanitize(input)).toBe("\uFB01le");
  });

  it("should be idempotent", () => {
    const input = "\uFEFFH\u200Bi<!-- -->";
    const once = sanitize(input);
    const twice = sanitize(once);
    expect(twice).toBe(once);
    expect(once).toBe("Hi");
  });

  it("should handle mixed content", () => {
    const input = "\uFEFF<!-- start -->Hb\u200By\uFE0Fe\u3000[]()\uFB01";
    // Expect: "Hbye \uFB01"
    expect(sanitize(input)).toBe("Hbye \uFB01");
  });
});

describe("sanitizeStrict", () => {
  it("should perform full NFKC normalization", () => {
    const input = "\uFB01"; // fi ligature
    expect(sanitizeStrict(input)).toBe("fi");
  });

  it("should perform safe sanitization first", () => {
    const input = "\uFEFF\uFB01";
    // Remove BOM then normalize
    expect(sanitizeStrict(input)).toBe("fi");
  });
});
