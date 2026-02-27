# @promptshield/workspace

## 1.0.0

### Major Changes

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - feat: migrate artifacts to dedicated `.promptshield/` directory

  PromptShield artifacts are now stored inside a dedicated `.promptshield/`
  directory instead of being written to the repository root.

  ### Changes

  - `.promptshield-cache.json` → `.promptshield/cache.json` (or split cache files)
  - `promptshield-report.md` → `.promptshield/reports/`

  ### Why

  - Avoids polluting repository root
  - Improves artifact isolation
  - Simplifies ignore configuration
  - Enables future expansion (state, lockfiles, split cache mode)

  ### Migration Notes

  Old artifact files in the repository root are no longer used.
  They can be safely deleted.

  Users should ensure `.promptshield/` is ignored in version control if desired.

### Minor Changes

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - Add fix and sanitization workflows.

  ### ✨ New Features

  - Added `scanAndFixWorkspace()`
    Streams workspace scan results while applying automatic fixes.

  - Added `sanitizeWorkspace()`
    Provides concurrent, workspace-level sanitization with:
    - strict mode support
    - optional write (dry-run by default)
    - deterministic progress events
    - change detection (`changed` flag)

  ### 🧠 Architectural Improvements

  - Fix and sanitize workflows are now first-class workspace responsibilities.
  - CLI no longer performs file-level IO or transformation logic.
  - Workspace layer owns:
    - file resolution
    - concurrency control
    - mutation semantics
    - progress reporting

  This improves separation of concerns and enables reuse across:

  - CLI
  - LSP
  - future automation tools

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - Add workspace-level scanning and persistent caching support.

  ### ✨ Features

  - Implemented workspace scanning with configurable cache strategy (`single`, `split`, `auto`)
  - Added versioned persistent cache with atomic writes and stale lock recovery
  - Introduced bounded concurrency for large repository handling

  ### 🛠 Utilities Added

  - `createLimiter` – Lightweight concurrency limiter
  - `isBinary` – Heuristic binary file detection
  - `ensureDir` – Recursive directory creation helper
  - `atomicWrite` – Crash-safe atomic file write helper
  - `sha256` – Deterministic hashing utility

  Improves scalability and performance for large repositories while maintaining safe concurrent execution semantics.

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - feat(workspace): add sub-directory level ignore support (Git-style hierarchy)

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

### Patch Changes

- Updated dependencies [[`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333)]:
  - @promptshield/core@0.1.0
  - @promptshield/ignore@1.0.0
  - @promptshield/sanitizer@0.0.1
