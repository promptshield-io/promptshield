---
"@promptshield/cli": patch
---

- fix(cli): resolve all paths relative to `cwd`, not project root

  `runPromptShield` was calling `findProjectRoot` internally and using
  the result for file path reporting and report generation. This caused
  `.promptshield/workspace-report.md` and log output to be anchored to
  the detected project root rather than the directory the CLI was invoked
  from.

  **What changed:**

  - Removed `findProjectRoot` from `runPromptShield`; all path operations
    now use `process.cwd()` consistently
  - `--check` mode log messages now show paths relative to cwd
  - `--report` output is written to `<cwd>/.promptshield/workspace-report.md`
  - `workspaceRoot` (via `findProjectRoot`) is retained in `cli.ts` solely
    for config file resolution via `resolveConfig`

  **Behavioral guarantee:** scan targets, cache/temp files, and reports are
  all anchored to the current working directory. The project root is used
  only to locate `promptshield.config.*`.
