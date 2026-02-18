[**@promptshield/core**](../index.md)

***

[@promptshield/core](../index.md) / ThreatCategory

# Enumeration: ThreatCategory

Defined in: [types.ts:18](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L18)

Categories of threats detected by PromptShield.

Categories describe the *type of attack vector* rather than
the specific implementation detail.

## Enumeration Members

### Homoglyph

> **Homoglyph**: `"HOMOGLYPH"`

Defined in: [types.ts:35](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L35)

Mixed-script characters that visually resemble others.

Example:
Cyrillic "а" vs Latin "a".

***

### Injection

> **Injection**: `"PROMPT_INJECTION"`

Defined in: [types.ts:52](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L52)

Prompt injection patterns.

Deterministic, rule-based detection only.

***

### Invisible

> **Invisible**: `"INVISIBLE_CHAR"`

Defined in: [types.ts:27](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L27)

Invisible Unicode characters such as:
- Zero Width Space (ZWSP)
- Zero Width Joiner (ZWJ)
- BIDI markers

These are commonly used for prompt injection smuggling.

***

### Normalization

> **Normalization**: `"NORMALIZATION"`

Defined in: [types.ts:66](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L66)

Unicode normalization inconsistencies where visually identical
characters differ at the code-point level.

***

### Smuggling

> **Smuggling**: `"SMUGGLING"`

Defined in: [types.ts:45](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L45)

Encoded or concealed content intended to bypass inspection.

Examples:
- Base64 payloads
- hidden markdown
- encoded instructions

***

### Trojan

> **Trojan**: `"TROJAN_SOURCE"`

Defined in: [types.ts:60](https://github.com/promptshield-io/promptshield/blob/main/packages/core/src/types.ts#L60)

Trojan Source attack vectors (CVE-2021-42574).

These use bidirectional override characters to manipulate
code or prompt interpretation.
