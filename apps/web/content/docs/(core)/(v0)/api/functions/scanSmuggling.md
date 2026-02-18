[**@promptshield/core**](../index.md)

***

[@promptshield/core](../index.md) / scanSmuggling

# Function: scanSmuggling()

> **scanSmuggling**(`text`, `options?`, `context?`): [`ThreatReport`](../interfaces/ThreatReport.md)[]

Defined in: [smuggling.ts:86](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/smuggling.ts#L86)

Smuggling detector.

Detects techniques used to conceal instructions or data inside text.

Rules emitted:

PSS001 — Invisible-character steganography (HIGH)
PSS002 — Base64 payload with readable content (MEDIUM)
PSS003 — Hidden Markdown comment (LOW)
PSS004 — Invisible Markdown link (LOW)

Span semantics:
  offendingText = entire suspicious region
  decodedPayload = recovered payload when available

Context is intentionally mutable so detectors can share `lineOffsets`.

## Parameters

### text

`string`

### options?

[`ScanOptions`](../interfaces/ScanOptions.md) = `{}`

### context?

[`ScanContext`](../interfaces/ScanContext.md) = `{}`

## Returns

[`ThreatReport`](../interfaces/ThreatReport.md)[]
