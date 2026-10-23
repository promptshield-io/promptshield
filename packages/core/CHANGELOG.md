# @promptshield/core

## 1.0.0

### Major Changes

- [#5](https://github.com/promptshield-io/promptshield/pull/5) [`33694ff`](https://github.com/promptshield-io/promptshield/commit/33694ff124629e4f7797e1624b1a3acde8af0c38) Thanks [@mayank1513](https://github.com/mayank1513)! - Remove performance metrics from the core scanning API.

  The `ScanStats` interface has been removed and the `stats` field has been
  removed from `ScanResult`.

  Performance measurements such as `durationMs` and `totalChars` are now considered
  integration concerns and should be implemented by higher-level tooling such as
  the CLI, LSP, or other runtime wrappers.

  `@promptshield/core` now focuses purely on deterministic lexical scanning and
  threat detection without runtime instrumentation.

  ### API change summary

  Before:

  ```ts
  export interface ScanResult {
    threats: ThreatReport[];
    stats: ScanStats;
    isClean: boolean;
  }
  ```

  After:

  ```ts
  export interface ScanResult {
    threats: ThreatReport[];
    isClean: boolean;
  }
  ```

  `scan()` no longer returns the stats.

  This change affects any integrations relying on runtime performance metrics
  returned from `scan()`.

  Consumers should measure performance externally if needed.

- [#5](https://github.com/promptshield-io/promptshield/pull/5) [`4c3ddc7`](https://github.com/promptshield-io/promptshield/commit/4c3ddc7a2f3e2a5c0d085ee8f34463bbbeaa7056) Thanks [@mayank1513](https://github.com/mayank1513)! - Refactored the core scanning engine to use offset-based detection and centralized location resolution.
  - Detectors now operate on absolute character offsets instead of line/column coordinates.
  - Introduced `enrichWithLocation` utility for post-processing character offsets into human-readable locations.
  - Simplified `scan` entry point by removing manual line-splitting logic.
  - Updated `ThreatReport` to use a `range` object.

    ```ts
    range: {
      start: {
        line, column, index;
      }
      end: {
        line, column, index;
      }
    }
    ```

- [#5](https://github.com/promptshield-io/promptshield/pull/5) [`aac8870`](https://github.com/promptshield-io/promptshield/commit/aac8870183a5b118348e2b0e4bc9323bf86ecb32) Thanks [@mayank1513](https://github.com/mayank1513)! - Enhance detection coverage and introduce multi-line threat spans.

  ## Security
  - Added **hex-encoded payload detection (PSS006)** to detect hidden instructions encoded in hexadecimal.
  - Improved **Base64 payload detection (PSS002)** with support for:
    - whitespace-broken Base64
    - character-spaced Base64 obfuscation.

  - Added **hidden HTML container detection (PSS005)** for `<details>` and `<template>` elements used to conceal instructions.
  - Improved **Trojan Source detection** with support for nested BIDI contexts.

  ## Breaking
  - Threat ranges may now span **multiple lines**.
  - Consumers must not assume threats occur on a single line.
  - UI layers should project multi-line threats into per-line diagnostics when needed.

  ## Added
  - **PSS005** — Hidden HTML container detection.
  - **PSS006** — Hex-encoded payload detection.
  - Support for **chunked / spaced Base64 evasion techniques**.

  ## Improved
  - Trojan Source detector now correctly handles **nested BIDI override contexts**.
  - Added coverage for additional directionality marks:
    - LRM (`U+200E`)
    - RLM (`U+200F`)
    - ALM (`U+061C`)

  - Unicode iteration updated to **code point–safe traversal**.
  - Correct handling of **CRLF and mixed line endings**.

  ## Docs
  - Updated smuggling detector documentation.
  - Added real-world Trojan Source examples from the original research paper.
  - Improved explanations for multi-line threat handling.

## 0.1.0

### Minor Changes

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - feat(core): export `SEVERITY_MAP` for cross-package reuse

  `SEVERITY_MAP` is now publicly exported from `@promptshield/core`.

  This provides a canonical numeric severity ranking to ensure
  consistent threshold comparisons and sorting across all
  PromptShield packages (CLI, workspace, LSP, etc.).

  Individual packages defining their own internal severity ranking maps
  will cause inconsistencies across the ecosystem. This change centralizes
  severity semantics and prevents drift as we evolve the ecosystem.

  No breaking changes.
