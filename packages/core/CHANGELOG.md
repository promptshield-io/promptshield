# @promptshield/core

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
