[**@promptshield/core**](../index.md)

***

[@promptshield/core](../index.md) / Severity

# Type Alias: Severity

> **Severity** = `"LOW"` \| `"MEDIUM"` \| `"HIGH"` \| `"CRITICAL"`

Defined in: [types.ts:10](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L10)

Severity levels assigned to detected threats.

These levels are ordered by risk:

LOW < MEDIUM < HIGH < CRITICAL

The scanner may filter results using `ScanOptions.minSeverity`.
