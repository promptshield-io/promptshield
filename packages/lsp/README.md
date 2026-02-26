# @promptshield/lsp <img src="https://raw.githubusercontent.com/mayank1513/mayank1513/main/popper.png" style="height: 40px"/>

<img alt="PromptShield Banner" src="https://raw.githubusercontent.com/promptshield-io/promptshield/main/banner.gif" />

<p className="flex gap-2">
  <a href="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml" rel="noopener noreferrer">
    <img alt="CI" src="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://codecov.io/gh/promptshield-io/promptshield/tree/main/packages/@promptshield/lsp" rel="noopener noreferrer">
    <img alt="codecov" src="https://codecov.io/gh/promptshield-io/promptshield/graph/badge.svg?flag=@promptshield/lsp" />
  </a> 
  <a href="https://npmjs.com/package/@promptshield/lsp" rel="noopener noreferrer">
    <img alt="npm version" src="https://img.shields.io/npm/v/@promptshield/lsp" />
  </a>
  <a href="https://npmjs.com/package/@promptshield/lsp" rel="noopener noreferrer">
    <img alt="npm downloads" src="https://img.shields.io/npm/d18m/@promptshield/lsp" />
  </a>
  <a href="https://npmjs.com/package/@promptshield/lsp" rel="noopener noreferrer">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/@promptshield/lsp" />
  </a>
  <img alt="license" src="https://img.shields.io/npm/l/@promptshield/lsp" />
</p>

> **The Brain of PromptShield.** A fully compliant Language Server Protocol (LSP) implementation that provides threat detection, diagnostics, and remediation for any editor.

---

## ✨ Features

- **Universal Compatibility**: Works with VS Code, Neovim, Sublime Text, IntelliJ, and more.
- **Real-Time Analysis**: Debounced scanning of documents as you type.
- **Code Actions**:
  - `Quick Fix`: Remove invisible characters or fix BIDI overrides.
  - `Fix All`: Apply all safe fixes in the document.
- **Diagnostics**: Publishes standard LSP diagnostics for detected threats.
- **Hover Support**: detailed explanation of threats when hovering over underlined text.
- **Workspace Scanning**: Capability to scan entire project trees.

---

## 📦 Installation

```bash
$ pnpm add @promptshield/lsp
```

---

## 🏗️ internal Architecture

<details>
<summary>View internal architecture and integration details</summary>

The server is built on `vscode-languageserver` and orchestrates:

1.  **Document Lifecycle**: Tracks open files and changes via `TextDocuments`.
2.  **Validation Loop**:
    - Debounces input (default 300ms).
    - Calls `@promptshield/core` to scan text.
    - Filters false positives via `@promptshield/ignore`.
    - Publishes `Diagnostic[]` back to the client.
3.  **Code Action Provider**:
    - Generates `WorkspaceEdit` objects to surgically repair text.

---

## 🔌 Integration

To use this with a custom LSP client:

```ts
import { startLspServer } from "@promptshield/lsp";

// Start scanning on stdio (default)
startLspServer();
```

Or connect via IPC/Socket depending on your host environment.

</details>

> 📚 **Deep Dives**: To understand exactly how "Fix with AI" or full Workspace Scanning operates inside the LSP Server, see the [Documentation section](https://promptshield.js.org/docs/lsp).

---

## License

This library is licensed under the MIT open-source license.

<hr />

<p align="center">with 💖 by <a href="https://mayankchaudhari.com" target="_blank">Mayank Kumar Chaudhari</a></p>
