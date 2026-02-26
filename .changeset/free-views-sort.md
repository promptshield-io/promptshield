---
"@promptshield/workspace": minor
---

Add fix and sanitization workflows.

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
