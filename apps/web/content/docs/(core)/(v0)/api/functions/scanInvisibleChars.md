[**@promptshield/core**](../index.md)

***

[@promptshield/core](../index.md) / scanInvisibleChars

# Function: scanInvisibleChars()

> **scanInvisibleChars**(`text`, `options?`, `context?`): [`ThreatReport`](../interfaces/ThreatReport.md)[]

Defined in: [invisible.ts:63](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/invisible.ts#L63)

Invisible-character detector.

Emits one primary span-level rule using precedence:

PSU004 → Unicode tag payload
PSU005 → Excessive invisible padding
PSU001 → Invisible characters present

PSU002 is emitted independently for boundary manipulation.

## Parameters

### text

`string`

### options?

[`ScanOptions`](../interfaces/ScanOptions.md) = `{}`

### context?

[`ScanContext`](../interfaces/ScanContext.md) = `{}`

## Returns

[`ThreatReport`](../interfaces/ThreatReport.md)[]
