---
"@promptshield/workspace": patch
---

fix: `atomicWrite` now calls `ensureDir` on the target directory before
writing the temp file, preventing ENOENT errors when the directory does
not yet exist.
