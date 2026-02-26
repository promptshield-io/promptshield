---
"@promptshield/core": minor
---

feat(core): export `SEVERITY_MAP` for cross-package reuse

`SEVERITY_MAP` is now publicly exported from `@promptshield/core`.

This provides a canonical numeric severity ranking to ensure
consistent threshold comparisons and sorting across all
PromptShield packages (CLI, workspace, LSP, etc.).

Individual packages defining their own internal severity ranking maps
will cause inconsistencies across the ecosystem. This change centralizes
severity semantics and prevents drift as we evolve the ecosystem.

No breaking changes.
