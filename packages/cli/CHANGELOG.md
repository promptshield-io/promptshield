# @promptshield/cli

## 1.0.4

### Patch Changes

- Updated dependencies [[`2c3d7ad`](https://github.com/promptshield-io/promptshield/commit/2c3d7ad48678c7f00360e33ab4b7873fcb309ca2)]:
  - @promptshield/workspace@1.0.4

## 1.0.3

### Patch Changes

- [`3b2230b`](https://github.com/promptshield-io/promptshield/commit/3b2230b9fd3c20617b7b81db49e1b877876c9cc7) Thanks [@mayank1513](https://github.com/mayank1513)! - fix(cli): use `realpathSync` for ESM entry point detection

  `process.argv[1]` may be a symlink (e.g. when installed globally via
  `pnpm` or `npm`), causing the `isCLI` check to fail and the CLI to
  silently do nothing when invoked directly.

  Replaced the strict equality check with `realpathSync(process.argv[1])`
  to resolve symlinks before comparing against `fileURLToPath(import.meta.url)`.

## 1.0.2

### Patch Changes

- Updated dependencies [[`a9d483a`](https://github.com/promptshield-io/promptshield/commit/a9d483a4ab2d65da4fde08b66befbddd5647b7c8)]:
  - @promptshield/workspace@1.0.3

## 1.0.1

### Patch Changes

- [`92d3764`](https://github.com/promptshield-io/promptshield/commit/92d3764f09147dc9aea7edfddb4bd483035d568b) Thanks [@mayank1513](https://github.com/mayank1513)! - - fix(cli): resolve all paths relative to `cwd`, not project root

  `runPromptShield` was calling `findProjectRoot` internally and using
  the result for file path reporting and report generation. This caused
  `.promptshield/workspace-report.md` and log output to be anchored to
  the detected project root rather than the directory the CLI was invoked
  from.

  **What changed:**

  - Removed `findProjectRoot` from `runPromptShield`; all path operations
    now use `process.cwd()` consistently
  - `--check` mode log messages now show paths relative to cwd
  - `--report` output is written to `<cwd>/.promptshield/workspace-report.md`
  - `workspaceRoot` (via `findProjectRoot`) is retained in `cli.ts` solely
    for config file resolution via `resolveConfig`

  **Behavioral guarantee:** scan targets, cache/temp files, and reports are
  all anchored to the current working directory. The project root is used
  only to locate `promptshield.config.*`.

## 1.0.0

### Major Changes

- [`519bf75`](https://github.com/promptshield-io/promptshield/commit/519bf750e3ade52bc954d4766bb1bd47704f9e1b) Thanks [@mayank1513](https://github.com/mayank1513)! - feat(@promptshield/cli): release v1.0.0 - Production ready

  The CLI has reached maturity and is now officially production-ready. This major release signifies a stable API and robust performance for auditing AI prompts in development workflows and CI/CD pipelines.

### Patch Changes

- Updated dependencies [[`36c59e8`](https://github.com/promptshield-io/promptshield/commit/36c59e8a177ab763050017226c12a317d36fc32d), [`ac51eda`](https://github.com/promptshield-io/promptshield/commit/ac51eda96f796d5b175b17f997a675e0b1ea375e)]:
  - @promptshield/sanitizer@1.0.0
  - @promptshield/workspace@1.0.2

## 0.1.2

### Patch Changes

- Updated dependencies [[`33694ff`](https://github.com/promptshield-io/promptshield/commit/33694ff124629e4f7797e1624b1a3acde8af0c38), [`a8fcfc7`](https://github.com/promptshield-io/promptshield/commit/a8fcfc73e15990e6d5c0e1c98469d12700670891), [`aac8870`](https://github.com/promptshield-io/promptshield/commit/aac8870183a5b118348e2b0e4bc9323bf86ecb32), [`4c3ddc7`](https://github.com/promptshield-io/promptshield/commit/4c3ddc7a2f3e2a5c0d085ee8f34463bbbeaa7056), [`aac8870`](https://github.com/promptshield-io/promptshield/commit/aac8870183a5b118348e2b0e4bc9323bf86ecb32)]:
  - @promptshield/core@1.0.0
  - @promptshield/workspace@1.0.1
  - @promptshield/ignore@2.0.0
  - @promptshield/sanitizer@0.0.2

## 0.1.1

### Patch Changes

- [`6a7e063`](https://github.com/promptshield-io/promptshield/commit/6a7e063a15c4474964f1cdeeea39912996d19579) Thanks [@mayank1513](https://github.com/mayank1513)! - fix(cli): remove CommonJS runtime guard and use pure ESM entry detection

  Replaced hybrid `require.main === module` logic with ESM-safe
  `fileURLToPath(import.meta.url)` comparison.

  Prevents `ReferenceError: module is not defined` in Node 22+
  when running via `pnpx`.

## 0.1.0

### Minor Changes

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - feat(cli): add Markdown workspace report generation
  feat(lsp): add workspace-level scan and fix commands
  feat(vscode): expose Scan Workspace and Fix Workspace commands

  ## CLI

  - Added `--report` flag to generate a detailed Markdown report.
  - Report includes:
    - Per-file threat listings
    - Aggregate totals
    - Fixed / skipped breakdown
  - Output path:
    `.promptshield/workspace-report.md`
  - Report generation runs after scan/fix execution.
  - Works with caching and streaming workspace scans.

  ## LSP

  Added new workspace commands:

  - `promptshield.scanWorkspace`
  - `promptshield.fixWorkspace`

  These commands:

  - Trigger full workspace scan via `runWorkspaceScan`
  - Respect config (minSeverity, cacheMode, noInlineIgnore, etc.)
  - Stream results back to client
  - Publish diagnostics per file
  - Support fix preview and write modes

  Designed for:

  - IDE-level security auditing
  - Large repository support
  - Consistent behavior with CLI

  ## VSCode Extension

  Added command palette entries:

  - **PromptShield: Scan Workspace**
  - **PromptShield: Fix Workspace**

  Behavior:

  - Delegates to LSP commands
  - Shows progress notifications
  - Updates Problems panel
  - Honors user configuration
  - Supports cache strategy

  ## Impact

  - Enables enterprise-scale workspace auditing
  - Improves CI + IDE parity
  - Adds human-readable security reporting
  - Strengthens multi-surface integration (CLI + LSP + VSCode)

  ## Notes

  - No breaking changes
  - No config schema changes
  - Fully backward compatible

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

- Updated dependencies [[`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333), [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333)]:
  - @promptshield/core@0.1.0
  - @promptshield/workspace@1.0.0
  - @promptshield/ignore@1.0.0
  - @promptshield/sanitizer@0.0.1
