---
"promptshield": minor
"@promptshield/lsp": minor
---

feat(config): add `minSeverity` and `cacheMode` settings

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
