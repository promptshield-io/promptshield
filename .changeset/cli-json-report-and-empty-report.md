---
"@promptshield/cli": minor
"@promptshield/workspace": patch
---

**`@promptshield/cli`**: `--report --json` now writes a JSON report file (`.promptshield/workspace-report.json`) in addition to the Markdown report. The `--report` flag no longer requires threats to be present — a clean-scan report is always generated.

**`@promptshield/workspace`**: `generateWorkspaceReport` no longer early-returns when no threats are found. A report with a "✅ No threats detected." message is written instead.
