---
"@promptshield/ignore": minor
---

Store `definedAt` as a precise text range instead of a line number.

Previously, the ignore directive location was tracked using only the line number. It now stores an exact `{ start, end }` position (line + character offset), enabling accurate and stable highlighting of unused ignore directives in LSP and editor integrations.

This improves diagnostic precision and editor UX without changing scan semantics or filtering behavior.
