/** biome-ignore-all lint/suspicious/noExplicitAny: Use of any is ok for test files */

import { describe, test } from "vitest";
import { DEFAULT_CONFIG, promptshieldCli } from "./main";

describe("promptshieldCli", () => {
  test("should work with default config", async ({ expect }) => {
    // Basic connectivity test
    await expect(promptshieldCli(DEFAULT_CONFIG)).resolves.not.toThrow();
  });
});
