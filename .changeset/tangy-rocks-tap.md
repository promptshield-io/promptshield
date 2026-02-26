---
"@promptshield/workspace": minor
"promptshield": minor
"@promptshield/cli": minor
"@promptshield/lsp": minor
---

feat(workspace): add sub-directory level ignore support (Git-style hierarchy)

Workspace file resolution now respects ignore files located in sub-directories,
not just the repository root.

### What changed

- Recursively discovers supported ignore files:
  - `.gitignore`
  - `.promptshieldignore`
  - `.psignore`
- Applies ignore files using parent → child directory precedence (Git-like behavior)
- Scopes patterns relative to the directory containing the ignore file
- Correctly handles negation rules (`!pattern`)
- Preserves glob semantics (`**`, `*`, directory-only rules)

### Previously

Only root-level ignore files were respected.

### Now

Ignore rules defined in nested directories are applied correctly,
matching expected Git-style hierarchical behavior.

This improves correctness for large monorepos and multi-package workspaces.
