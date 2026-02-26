---
"@promptshield/workspace": minor
---

Add workspace-level scanning and persistent caching support.

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