---
"@promptshield/workspace": patch
---

normalize CLI-style path inputs in resolveFiles

- Convert "." and "./" to "**/*"
- Expand directory inputs to recursive glob patterns
- Preserve ignore filtering behavior
- Update resolveFiles doc comment