---
"@promptshield/cli": patch
---

fix(cli): remove CommonJS runtime guard and use pure ESM entry detection

Replaced hybrid `require.main === module` logic with ESM-safe
`fileURLToPath(import.meta.url)` comparison.

Prevents `ReferenceError: module is not defined` in Node 22+
when running via `pnpx`.
