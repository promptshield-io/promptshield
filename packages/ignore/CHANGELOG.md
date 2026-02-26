# @promptshield/ignore

## 1.0.0

### Major Changes

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - refactor!: rename `noIgnore` to `noInlineIgnore`

  BREAKING CHANGE:

  The `noIgnore` option has been renamed to `noInlineIgnore`
  to clarify that it only disables inline ignore directives
  (e.g. `// promptshield-ignore`) and does not affect
  file-level ignore rules such as `.gitignore`.

  ### Migration

  Before:

  ```ts
  noIgnore: true;
  ```

  After:

  ```ts
  noInlineIgnore: true;
  ```

  This improves API clarity and avoids confusion between
  workspace-level ignore files and inline ignore directives.

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - refactor!: rename `FilterThreatsResult` to `FilteredThreatsResult`

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

### Minor Changes

- [#1](https://github.com/promptshield-io/promptshield/pull/1) [`811fad0`](https://github.com/promptshield-io/promptshield/commit/811fad055be08b2bf845aa3daff18fdb90677333) Thanks [@mayank1513](https://github.com/mayank1513)! - Store `definedAt` as a precise text range instead of a line number.

  Previously, the ignore directive location was tracked using only the line number. It now stores an exact `{ start, end }` position (line + character offset), enabling accurate and stable highlighting of unused ignore directives in LSP and editor integrations.

  This improves diagnostic precision and editor UX without changing scan semantics or filtering behavior.
