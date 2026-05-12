---
"@promptshield/workspace": patch
---

Fix cache entries being lost when `cache.json` is missing or newly created.

- `loadSingle` was resetting `this.cache` to empty in its `.catch` block when the file didn't exist, discarding in-memory entries accumulated during the current scan. Replaced with `loadPromise = null` so the next call retries without wiping state.
- After the constructor pre-creates an empty `cache.json`, `loadSingle` would immediately read it back and overwrite `this.cache` with empty entries. Fixed by resetting `loadPromise = null` after the write so the load is deferred until entries are actually needed.
- `clear()` now explicitly resets `this.cache` in-memory, ensuring force rescan starts from a clean state without relying on the `loadSingle` catch side-effect.
