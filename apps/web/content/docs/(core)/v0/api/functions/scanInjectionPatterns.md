[**@promptshield/core**](../index.md)

***

[@promptshield/core](../index.md) / scanInjectionPatterns

# Function: scanInjectionPatterns()

> **scanInjectionPatterns**(`text`, `options?`, `context?`): [`ThreatReport`](../interfaces/ThreatReport.md)[]

Defined in: [injection-patterns.ts:100](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/injection-patterns.ts#L100)

Scan for deterministic prompt-injection patterns.

Detection strategy:
- Scan line-by-line for stable location reporting
- Attempt direct regex detection first
- Fall back to normalized detection

Span semantics:
  offendingText = matched instruction phrase or entire line

## Parameters

### text

`string`

### options?

[`ScanOptions`](../interfaces/ScanOptions.md) = `{}`

### context?

[`ScanContext`](../interfaces/ScanContext.md) = `{}`

## Returns

[`ThreatReport`](../interfaces/ThreatReport.md)[]
