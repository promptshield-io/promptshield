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
    expect(value).toContain("$(alert)");
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
    expect(value).toContain("$(shield)");
    expect(value).toContain("LOW");
  });
});
