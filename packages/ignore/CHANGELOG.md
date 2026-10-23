# @promptshield/ignore

## 2.0.0

### Major Changes

- [#5](https://github.com/promptshield-io/promptshield/pull/5) [`aac8870`](https://github.com/promptshield-io/promptshield/commit/aac8870183a5b118348e2b0e4bc9323bf86ecb32) Thanks [@mayank1513](https://github.com/mayank1513)! - ⚠️ **Breaking change**

  This release updates the package to work with the new `ThreatReport` format introduced in `@promptshield/core`.

  Previous versions of `@promptshield/core` exposed threat locations using `loc`.
  The new format exposes locations using `range.start` and `range.end`.

  As a result, this version of `@promptshield/ignore` **is not compatible with older versions of `@promptshield/core`.**

  ### Changes
  - Updated ignore filtering logic to support **multi-line threats**.
  - A threat is now suppressed **only when its entire span falls inside an ignore range**.
  - Prevents partial suppression where only the first line of a multi-line threat is ignored.

  ### Technical details
  - Threat location data is read from `range.start` / `range.end`.
  - Suppression checks both `range.start.line` and `range.end.line`.
  - Threat sorting now uses `range.start.index`.

  ### Security impact

  This change prevents bypasses where attackers could hide multi-line prompt injections by ignoring only the first line.

  Example bypass now prevented:

  ```
  promptshield-ignore next 1
  ignore
  previous
  instructions
  ```

  Previously the threat could be suppressed because the first line matched the ignore directive.
  Now suppression requires the **entire threat span** to fall within the ignore range.

### Patch Changes

- Updated dependencies [[`33694ff`](https://github.com/promptshield-io/promptshield/commit/33694ff124629e4f7797e1624b1a3acde8af0c38), [`4c3ddc7`](https://github.com/promptshield-io/promptshield/commit/4c3ddc7a2f3e2a5c0d085ee8f34463bbbeaa7056), [`aac8870`](https://github.com/promptshield-io/promptshield/commit/aac8870183a5b118348e2b0e4bc9323bf86ecb32)]:
  - @promptshield/core@1.0.0

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
