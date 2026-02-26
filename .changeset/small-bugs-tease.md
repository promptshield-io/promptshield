---
"@promptshield/workspace": major
"promptshield": major
"@promptshield/lsp": major
---

feat: migrate artifacts to dedicated `.promptshield/` directory

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
