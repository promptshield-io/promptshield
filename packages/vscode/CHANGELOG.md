# promptshield

## 1.0.0

### Major Changes

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - refactor!: rename `noIgnore` to `noInlineIgnore`

  BREAKING CHANGE:

  The `noIgnore` option has been renamed to `noInlineIgnore`
  to clarify that it only disables inline ignore directives
  (e.g. `// promptshield-ignore`) and does not affect
  file-level ignore rules such as `.gitignore`.

  ### Migration

  Before:

  ```ts
  noIgnore: true;
  ```

  After:

  ```ts
  noInlineIgnore: true;
  ```

  This improves API clarity and avoids confusion between
  workspace-level ignore files and inline ignore directives.

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

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - feat(config): add `minSeverity` and `cacheMode` settings

  Introduces two new configuration options:

  ### `promptshield.minSeverity`

  - Type: `"string"`
  - Default: `"LOW"`
  - Enum: `"CRITICAL" | "HIGH" | "MEDIUM" | "LOW"`
  - Description: Minimum severity level to report.

  ### `promptshield.cacheMode`

  - Type: `"string"`
  - Default: `"auto"`
  - Enum: `"single" | "split" | "auto" | "none"`
  - Description: Controls how workspace scan results are cached.

  This enables:

  - Severity-based filtering across CLI, LSP, and workspace scans.
  - Flexible caching strategies for small and large workspaces.

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

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - Refactor workspace scanning and add unused ignore highlighting.

  - Removed workspace scanning logic from LSP. Scanning is now delegated to `@promptshield/workspace`, using a generator-based architecture for better separation of concerns and reuse.
  - Added diagnostics for unused `promptshield-ignore` directives, enabling precise editor highlighting and improved security hygiene.

  This change improves architectural clarity and editor UX without altering core threat detection semantics.

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - Refactor CLI runtime to delegate scanning, fixing, and sanitization to `@promptshield/workspace`.

  ### 🔄 Refactor

  - Removed direct usage of:
    - `scan()`
    - `filterThreats()`
    - `applyFixes()`
    - `resolveFiles()`
  - CLI now streams events from:
    - `scanWorkspace()`
    - `scanAndFixWorkspace()`
    - `sanitizeWorkspace()`

  The CLI is now a pure orchestration layer.

  ### 🖥 Interactive Improvements

  - Added interactive single-line progress updates when running in TTY mode.
  - Progress output is padded to avoid visual artifacts.
  - Non-interactive environments (CI / JSON mode) fall back to structured logging.

  ### 🧭 Runtime Changes

  - `main` now accepts glob patterns directly.
  - Pattern-to-file resolution moved entirely to workspace layer.

  ### ➕ New CLI Options

  - `--cache-mode`, `-m`

    - Supported values: `"none" | "single" | "split" | "auto"`

  - `--force-full-scan`, `-f`
    - Forces a complete cache refresh.

  These map directly to `WorkspaceScanConfig`.

  ### 🧠 Behavior Improvements

  - CI defaults:
    - `noInlineIgnore = true`
    - `cacheMode = "none"`
  - Removed hard `process.exit()` calls.
  - Uses `process.exitCode` for better composability and testability.

  This refactor enforces a strict separation between:

  - CLI orchestration
  - Workspace execution
  - Core detection logic

### Patch Changes

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`f21c45e`](https://github.com/promptshield-io/promptshield/commit/f21c45e37317c5b8e226c518685851ba7c70dc53) Thanks [@mayank1513](https://github.com/mayank1513)! - Add LICENSE file to the VS Code extension package.

  Fix VS Code Marketplace icon not displaying by renaming `logo` field to `icon` in `package.json`.
