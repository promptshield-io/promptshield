# @promptshield/cli

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
