---
"promptshield": minor
---

Refactor CLI runtime to delegate scanning, fixing, and sanitization to `@promptshield/workspace`.

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
