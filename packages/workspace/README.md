# @promptshield/workspace <img src="https://raw.githubusercontent.com/mayank1513/mayank1513/main/popper.png" style="height: 40px"/>

<p className="flex gap-2">
  <a href="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml" rel="noopener noreferrer">
    <img alt="CI" src="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://codecov.io/gh/promptshield-io/promptshield/tree/main/packages/@promptshield/workspace" rel="noopener noreferrer">
    <img alt="codecov" src="https://codecov.io/gh/promptshield-io/promptshield/graph/badge.svg?flag=@promptshield/workspace" />
  </a> 
  <a href="https://npmjs.com/package/@promptshield/workspace" rel="noopener noreferrer">
    <img alt="npm version" src="https://img.shields.io/npm/v/@promptshield/workspace" />
  </a>
  <a href="https://npmjs.com/package/@promptshield/workspace" rel="noopener noreferrer">
    <img alt="npm downloads" src="https://img.shields.io/npm/d18m/@promptshield/workspace" />
  </a>
  <a href="https://npmjs.com/package/@promptshield/workspace" rel="noopener noreferrer">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/@promptshield/workspace" />
  </a>
  <img alt="license" src="https://img.shields.io/npm/l/@promptshield/workspace" />
</p>

<img alt="PromptShield Banner" src="https://raw.githubusercontent.com/promptshield-io/promptshield/main/banner.gif" />

> High-performance workspace scanning engine for PromptShield.
> Manages filesystem traversal, layered ignore resolution (.gitignore, .promptshieldignore, .psignore), concurrency, and caching while delegating detection to @promptshield/core and inline directive processing to @promptshield/ignore.

---

## ✨ What This Package Does

`@promptshield/workspace` is responsible for:

- Workspace file resolution
- Binary detection
- Concurrent file scanning
- Cache orchestration
- Severity filtering
- Markdown report generation

It does **not** implement detection logic — that lives in `@promptshield/core`.

It does **not** implement Inline ignore processing (Delegated to @promptshield/ignore)

---

## 📦 Installation

```bash
$ pnpm add @promptshield/workspace
```

**_or_**

```bash
$ npm install @promptshield/workspace
```

**_or_**

```bash
$ yarn add @promptshield/workspace
```

---

## Basic Workspace Scan

```ts
import { scanWorkspace } from "@promptshield/workspace";

const root = process.cwd();
const patterns = ["**/*.ts", "**/*.js"];

for await (const { path, result, progress } of scanWorkspace(patterns, root)) {
  console.log(
    `[${progress}%] ${path} → ${result.threats.length} active threats`
  );
}
```

Streaming. Concurrency-bounded. Memory safe.

---

## 🧠 How Scanning Works

## Execution Model

- Files are resolved using layered ignore rules.
- Scanning runs concurrently (default: 4 files).
- Results are yielded progressively via Async Generator.
- Output order matches task creation order.

---

## ⚙️ Configuration

<details>
<summary>View configuration options and detailed cache engine semantics</summary>

```ts
scanWorkspace(patterns, root, {
  minSeverity: "MEDIUM",
  noInlineIgnore: false,
  concurrency: 8,
  cacheMode: "auto",
  forceFullScan: false,
});
```

---

## Configuration Reference

### `minSeverity`

Minimum severity to report.

When caching is enabled:

- Baseline scan always runs with `"LOW"`
- Severity filtering is applied _after_ cache retrieval

Default: `"LOW"`

---

### `noInlineIgnore`

Disables `promptshield-ignore` inline directives.

Does NOT affect:

- `.gitignore`
- `.promptshieldignore`
- `.psignore`

Default: `false`

---

### `concurrency`

Maximum files processed in parallel.

Default: `4`

---

### `cacheMode`

- `"none"` → no persistent cache
- `"single"` → one cache file
- `"split"` → per-file hashed cache
- `"auto"` → strategy selected based on repo size

Default: `"auto"`

---

### `forceFullScan`

Clears cache and rescans everything.

Default: `false`

---

## 💾 Cache Semantics (Important)

When caching is enabled:

- Baseline scan always uses:

  - `minSeverity: "LOW"`
  - Inline ignore enabled

- Results are cached post-filtering
- Presentation-level filtering happens after retrieval

Cache writes are intentionally fire-and-forget.

Persistence must never block scan throughput.

</details>

> 📚 **Deep Dives**: For advanced explanations of how memory is managed during streaming, and exactly how caching locks and migration work, see the [Documentation section](https://promptshield.js.org/docs/workspace).

---

## 📄 Generate Workspace Report

```ts
import { generateWorkspaceReport } from "@promptshield/workspace";

await generateWorkspaceReport(rootPath, allThreats, totalThreatCount);
```

Generates:

```
<workspaceRoot>/.promptshield/workspace-report.md
```

Report includes:

- Timestamp
- Total threat count
- Affected files
- Grouped threats by line
- Editor-compatible `file://` links

Report is generated only if threats exist.

---

## 🔍 Binary File Handling

Binary files are automatically skipped using:

- NULL-byte detection
- Suspicious byte ratio heuristic

Prevents false positives in:

- Images
- PDFs
- Archives
- Office documents

---

## 🏗 Architecture Role

Used by:

- `@promptshield/cli`
- `@promptshield/lsp`

Ensures identical scanning semantics across environments.

---

## 🧩 Design Principles

- Deterministic output
- Streaming-first
- Cache-aware
- Editor-friendly
- Fail-safe behavior

---

## 📚 Documentation

- API reference: auto-generated
- Conceptual guides: `/docs/workspace`
- Recommended: `/docs/workspace/quick-start`

---

## 📄 License

MIT

---

<p align="center">Built with 💖 by <a href="https://mayankchaudhari.com" target="_blank">Mayank Kumar Chaudhari</a></p>
