---
"@promptshield/ignore": major
---

refactor!: rename `FilterThreatsResult` to `FilteredThreatsResult`

BREAKING CHANGE:

The exported type `FilterThreatsResult` has been renamed to
`FilteredThreatsResult` for naming consistency and grammatical clarity.

### Migration

Before:

```ts
import type { FilterThreatsResult } from "@promptshield/ignore";
```

After:

```ts
import type { FilteredThreatsResult } from "@promptshield/ignore";
```

No runtime behavior changes.

