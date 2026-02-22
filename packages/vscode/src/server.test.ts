import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startLspServer: vi.fn(),
}));

vi.mock("@promptshield/lsp", () => ({
  startLspServer: mocks.startLspServer,
}));

describe("Server Entry Point", () => {
  it("should call startLspServer", async () => {
    // Import the server module which immediately calls startLspServer
    await import("./server");
    expect(mocks.startLspServer).toHaveBeenCalled();
  });
});
