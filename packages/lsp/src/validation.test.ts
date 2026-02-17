import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { validateDocument } from "./validation";

// Mocks
const mockConnection = {
  sendDiagnostics: vi.fn(),
} as unknown as Connection;

vi.mock("@promptshield/core", () => ({
  scan: vi.fn(() => ({ threats: [] })),
}));

vi.mock("@promptshield/ignore", () => ({
  filterThreats: vi.fn((_text, threats) => ({ threats })),
}));

vi.mock("./diagnostics", () => ({
  convertReportsToDiagnostics: vi.fn(() => []),
}));

import { scan } from "@promptshield/core";
import { convertReportsToDiagnostics } from "./diagnostics";

describe("Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip validation if file size exceeds limit", async () => {
    const document = TextDocument.create(
      "file:///test.txt",
      "plaintext",
      1,
      "content",
    );
    const config = { maxFileSize: 5, debounceMs: 0 }; // Limit 5 chars

    // Document content length is 7 ("content")
    await validateDocument(document, mockConnection, config);

    expect(scan).not.toHaveBeenCalled();
    expect(mockConnection.sendDiagnostics).not.toHaveBeenCalled();
  });

  it("should validate and send diagnostics for valid files", async () => {
    const document = TextDocument.create(
      "file:///test.txt",
      "plaintext",
      1,
      "ok",
    );
    const config = { maxFileSize: 100, debounceMs: 0 };

    await validateDocument(document, mockConnection, config);

    expect(scan).toHaveBeenCalledWith("ok");
    expect(convertReportsToDiagnostics).toHaveBeenCalled();
    expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
      uri: "file:///test.txt",
      diagnostics: [],
    });
  });
});
