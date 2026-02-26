---
"@promptshield/cli": minor
"@promptshield/lsp": minor
"promptshield": minor
---

feat(cli): add Markdown workspace report generation
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
