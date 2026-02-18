[**@promptshield/core**](../index.md)

***

[@promptshield/core](../index.md) / scanSmuggling

# Function: scanSmuggling()

> **scanSmuggling**(`text`, `options?`, `context?`): [`ThreatReport`](../interfaces/ThreatReport.md)[]

Defined in: [smuggling.ts:91](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/smuggling.ts#L91)

Smuggling detector.

Detects techniques used to conceal instructions or data inside text.

Detection categories:

HIGH:
- Invisible-character steganography

MEDIUM:
- Base64 payloads containing readable content

LOW:
- Hidden Markdown comments
- Invisible Markdown links

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
