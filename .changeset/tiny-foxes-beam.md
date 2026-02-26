---
"promptshield": minor
"@promptshield/lsp": minor
---

Refactor workspace scanning and add unused ignore highlighting.

- Removed workspace scanning logic from LSP. Scanning is now delegated to `@promptshield/workspace`, using a generator-based architecture for better separation of concerns and reuse.
- Added diagnostics for unused `promptshield-ignore` directives, enabling precise editor highlighting and improved security hygiene.

This change improves architectural clarity and editor UX without altering core threat detection semantics.
