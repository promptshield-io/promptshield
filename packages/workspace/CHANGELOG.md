# @promptshield/workspace

## 1.0.4

### Patch Changes

- [`2c3d7ad`](https://github.com/promptshield-io/promptshield/commit/2c3d7ad48678c7f00360e33ab4b7873fcb309ca2) Thanks [@mayank1513](https://github.com/mayank1513)! - Fix cache entries being lost when `cache.json` is missing or newly created.

  - `loadSingle` was resetting `this.cache` to empty in its `.catch` block when the file didn't exist, discarding in-memory entries accumulated during the current scan. Replaced with `loadPromise = null` so the next call retries without wiping state.
  - After the constructor pre-creates an empty `cache.json`, `loadSingle` would immediately read it back and overwrite `this.cache` with empty entries. Fixed by resetting `loadPromise = null` after the write so the load is deferred until entries are actually needed.
  - `clear()` now explicitly resets `this.cache` in-memory, ensuring force rescan starts from a clean state without relying on the `loadSingle` catch side-effect.

## 1.0.3

### Patch Changes

- [`a9d483a`](https://github.com/promptshield-io/promptshield/commit/a9d483a4ab2d65da4fde08b66befbddd5647b7c8) Thanks [@mayank1513](https://github.com/mayank1513)! - refactor(cache): extract magic strings to constants and initialize cache.json on construction

  - Add `CACHE_FILE`, `STATE_FILE`, and `LOCK_FILE` constants to `constants.ts`
  - Replace all inline string literals (`"cache.json"`, `"state.json"`, `"cache.lock"`) with the new constants throughout `cache.ts`
  - Initialize `cache.json` in the `CacheManager` constructor when in `single` mode and the file does not yet exist, preventing a missing-file error on first read

## 1.0.2

### Patch Changes

- Updated dependencies [[`36c59e8`](https://github.com/promptshield-io/promptshield/commit/36c59e8a177ab763050017226c12a317d36fc32d), [`ac51eda`](https://github.com/promptshield-io/promptshield/commit/ac51eda96f796d5b175b17f997a675e0b1ea375e)]:
  - @promptshield/sanitizer@1.0.0

## 1.0.1

### Patch Changes

- [`a8fcfc7`](https://github.com/promptshield-io/promptshield/commit/a8fcfc73e15990e6d5c0e1c98469d12700670891) Thanks [@mayank1513](https://github.com/mayank1513)! - normalize CLI-style path inputs in resolveFiles

  - Convert "." and "./" to "\*_/_"
  - Expand directory inputs to recursive glob patterns
  - Preserve ignore filtering behavior
  - Update resolveFiles doc comment

- Updated dependencies [[`33694ff`](https://github.com/promptshield-io/promptshield/commit/33694ff124629e4f7797e1624b1a3acde8af0c38), [`aac8870`](https://github.com/promptshield-io/promptshield/commit/aac8870183a5b118348e2b0e4bc9323bf86ecb32), [`4c3ddc7`](https://github.com/promptshield-io/promptshield/commit/4c3ddc7a2f3e2a5c0d085ee8f34463bbbeaa7056), [`aac8870`](https://github.com/promptshield-io/promptshield/commit/aac8870183a5b118348e2b0e4bc9323bf86ecb32)]:
  - @promptshield/core@1.0.0
  - @promptshield/ignore@2.0.0
  - @promptshield/sanitizer@0.0.2

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
