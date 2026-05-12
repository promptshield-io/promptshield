---
"@promptshield/cli": patch
---

fix(cli): use `realpathSync` for ESM entry point detection

`process.argv[1]` may be a symlink (e.g. when installed globally via
`pnpm` or `npm`), causing the `isCLI` check to fail and the CLI to
silently do nothing when invoked directly.

Replaced the strict equality check with `realpathSync(process.argv[1])`
to resolve symlinks before comparing against `fileURLToPath(import.meta.url)`.
