---
"@promptshield/cli": minor
---

Added `--base-url <url>` and `--report-file-name <name>` flags to the `scan` and `fix` commands.

- `--base-url` prefixes relative file links in the generated report with an absolute URL (e.g. for GitHub PR comments).
- `--report-file-name` sets a custom stem for both the `.md` and `.json` report files. Defaults to `workspace-report`.
