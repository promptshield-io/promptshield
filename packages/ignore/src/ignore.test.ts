/** biome-ignore-all lint/suspicious/noExplicitAny: test file */
import { describe, expect, it } from "vitest";
import { filterThreats } from "./ignore";

const threat = (line: number) =>
  ({
    loc: { line, column: 1, index: 0 },
  }) as any;

describe("filterThreats", () => {
  it("returns threats unchanged when no ignore directives exist", () => {
    const text = "hello\nworld";
    const threats = [threat(1), threat(2)];

    const result = filterThreats(text, threats);

    expect(result.threats).toHaveLength(2);
    expect(result.unusedIgnores).toHaveLength(0);
  });

  it("ignores inline directive", () => {
    const text = "foo(); // promptshield-ignore";
    const threats = [threat(1)];

    const result = filterThreats(text, threats);

    expect(result.threats).toHaveLength(0);
    expect(result.unusedIgnores).toHaveLength(0);
  });

  it("ignores next line via comment-only directive", () => {
    const text = `
# promptshield-ignore
danger()
`.trim();

    const threats = [threat(2)];

    const result = filterThreats(text, threats);

    expect(result.threats).toHaveLength(0);
  });

  it("supports 'next N' directive", () => {
    const text = `
promptshield-ignore next 2
a()
b()
c()
`.trim();

    const threats = [threat(2), threat(3), threat(4)];

    const result = filterThreats(text, threats);

    expect(result.threats.map((t) => t.loc.line)).toEqual([4]);
  });

  it("supports ignore file directive", () => {
    const text = `
promptshield-ignore all
foo()
bar()
`.trim();

    const threats = [threat(2), threat(3)];

    const result = filterThreats(text, threats);

    expect(result.threats).toHaveLength(0);
  });

  it("reports unused ignore directives", () => {
    const text = `
promptshield-ignore next 2
safe()
safe()
`.trim();

    const threats: any[] = [];

    const result = filterThreats(text, threats);

    expect(result.unusedIgnores.length).toBe(1);
  });

  it("handles multiple ignore ranges", () => {
    const text = `
promptshield-ignore next
a()
promptshield-ignore next
b()
c()
`.trim();

    const threats = [threat(2), threat(4), threat(5)];

    const result = filterThreats(text, threats);

    expect(result.threats.map((t) => t.loc.line)).toEqual([5]);
  });

  it("handles unsorted threat input", () => {
    const text = `
promptshield-ignore next
danger()
`.trim();

    const threats = [threat(2), threat(1)];

    const result = filterThreats(text, threats);

    expect(result.threats.map((t) => t.loc.line)).toEqual([1]);
  });

  it("respects noInlineIgnore option to bypass directives", () => {
    const text = `
promptshield-ignore all
danger()
`.trim();

    const threats = [threat(2)];
    const result = filterThreats(text, threats, { noInlineIgnore: true });

    expect(result.threats).toHaveLength(1);
    expect(result.ignoredThreats).toHaveLength(0);
    expect(result.unusedIgnores).toHaveLength(0);
  });
});
