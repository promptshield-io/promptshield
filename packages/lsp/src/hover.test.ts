/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getHover } from "./hover";

// Mock dependencies
vi.mock("@promptshield/core", () => ({
  scan: vi.fn(),
}));
vi.mock("@promptshield/ignore", () => ({
  filterThreats: vi.fn((_text, threats) => ({ threats })),
}));

import { scan } from "@promptshield/core";

describe("LSP Hover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null if no threats at position", () => {
    const document = TextDocument.create(
      "file:///test.txt",
      "plaintext",
      1,
      "content",
    );
    vi.mocked(scan).mockReturnValue({ threats: [] } as any);

    const hover = getHover(document, { line: 0, character: 0 });
    expect(hover).toBeNull();
  });

  it("should return hover with $(alert) for HIGH severity", () => {
    const document = TextDocument.create(
      "file:///test.txt",
      "plaintext",
      1,
      "bad content",
    );
    vi.mocked(scan).mockReturnValue({
      threats: [
        {
          category: "TEST",
          severity: "HIGH",
          message: "Danger",
          offendingText: "bad",
          loc: { line: 1, column: 1, index: 0 },
        },
      ],
    } as any);

    const hover = getHover(document, { line: 0, character: 1 });
    expect(hover).not.toBeNull();
    const value = (hover?.contents as any).value;
    expect(value).toContain("![HIGH](data:image/svg+xml;base64,");
    expect(value).toContain("HIGH");
  });

  it("should return hover with $(shield) for LOW severity", () => {
    const document = TextDocument.create(
      "file:///test.txt",
      "plaintext",
      1,
      "meh content",
    );
    vi.mocked(scan).mockReturnValue({
      threats: [
        {
          category: "TEST",
          severity: "LOW",
          message: "Warning",
          offendingText: "meh",
          loc: { line: 1, column: 1, index: 0 },
        },
      ],
    } as any);

    const hover = getHover(document, { line: 0, character: 1 });
    expect(hover).not.toBeNull();
    const value = (hover?.contents as any).value;
    expect(value).toContain("![LOW](data:image/svg+xml;base64,");
    expect(value).toContain("LOW");
  });

  it("should return null if position is outside the threat line or character bounds", () => {
    const document = TextDocument.create(
      "file:///test.txt",
      "plaintext",
      1,
      "hello bad content", // "bad" is at index 6, length 3
    );
    vi.mocked(scan).mockReturnValue({
      threats: [
        {
          category: "TEST",
          severity: "HIGH",
          message: "Danger",
          offendingText: "bad",
          loc: { line: 1, column: 7, index: 6 },
        },
      ],
    } as any);

    // Line before
    expect(getHover(document, { line: -1, character: 6 })).toBeNull();
    // Line after
    expect(getHover(document, { line: 1, character: 6 })).toBeNull();
    // Character before
    expect(getHover(document, { line: 0, character: 5 })).toBeNull();
    // Character after
    expect(getHover(document, { line: 0, character: 9 })).toBeNull();
    // Correct position
    expect(getHover(document, { line: 0, character: 7 })).not.toBeNull();
  });

  it("should include suggestion block in hover markdown if present on threat", () => {
    const document = TextDocument.create(
      "file:///test.txt",
      "plaintext",
      1,
      "bad content",
    );
    vi.mocked(scan).mockReturnValue({
      threats: [
        {
          category: "TEST",
          severity: "HIGH",
          message: "Danger",
          offendingText: "bad",
          loc: { line: 1, column: 1, index: 0 },
          suggestion: "Remove this.",
        },
      ],
    } as any);

    const hover = getHover(document, { line: 0, character: 1 });
    const value = (hover?.contents as any).value;
    expect(value).toContain("**Suggestion:** Remove this.");
  });
});
