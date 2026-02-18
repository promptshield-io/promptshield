[**@promptshield/core**](../index.md)

***

[@promptshield/core](../index.md) / ScanContext

# Interface: ScanContext

Defined in: [types.ts:209](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L209)

Execution context for scanning text fragments.

Used when scanning partial content extracted from a larger source.

## Properties

### baseCol?

> `optional` **baseCol**: `number`

Defined in: [types.ts:220](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L220)

Base column offset.

#### Default

```ts
1
```

***

### baseLine?

> `optional` **baseLine**: `number`

Defined in: [types.ts:214](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L214)

Base line offset.

#### Default

```ts
1
```

***

### lineOffsets?

> `optional` **lineOffsets**: `number`[]

Defined in: [types.ts:225](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L225)

Precomputed line offsets for performance.
