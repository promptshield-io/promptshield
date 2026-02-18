[**@promptshield/core**](../index.md)

***

[@promptshield/core](../index.md) / decodeUnicodeTags

# Function: decodeUnicodeTags()

> **decodeUnicodeTags**(`text`): `string` \| `undefined`

Defined in: [invisible.ts:242](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/invisible.ts#L242)

Attempts to decode Unicode tag characters into ASCII text.

Unicode tag characters live in the range:

  U+E0000 – U+E007F

Each tag character encodes an ASCII value using:

  ASCII = codePoint - 0xE0000

Attackers can use this mechanism to embed hidden instructions
or metadata inside otherwise invisible text streams.

This decoder performs a best-effort extraction.

## Parameters

### text

`string`

## Returns

`string` \| `undefined`
