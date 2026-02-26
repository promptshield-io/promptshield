---
"promptshield": major
"@promptshield/lsp": major
"@promptshield/ignore": major
---

refactor!: rename `noIgnore` to `noInlineIgnore`

BREAKING CHANGE:

The `noIgnore` option has been renamed to `noInlineIgnore`
to clarify that it only disables inline ignore directives
(e.g. `// promptshield-ignore`) and does not affect
file-level ignore rules such as `.gitignore`.

### Migration

Before:

```ts
noIgnore: true
````

After:

```ts
noInlineIgnore: true
```

This improves API clarity and avoids confusion between
workspace-level ignore files and inline ignore directives.
