---
"@promptshield/workspace": patch
---

**`@promptshield/workspace`**: Refactored `generateWorkspaceReport` to use collapsible `<details>` elements with a three-level hierarchy (file → severity → line). Threats are now grouped by severity using `SEVERITY_ORDER` and `SEVERITY_ICON` constants, then by line number with sorted ordering. Each nested level has `padding-left: 1rem` for visual indentation. The summary header now uses proper Markdown line breaks (`  \n`) and includes `ruleId` in threat entries.
