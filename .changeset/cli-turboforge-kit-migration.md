---
"@promptshield/cli": patch
---

**`@promptshield/cli`**: Migrated dependency from `@turbo-forge/cli-kit` (dev) to `@turboforge/cli-kit` (runtime `^1.0.0`) and updated all imports accordingly. `findProjectRoot` is now awaited as it returns a `Promise`.
