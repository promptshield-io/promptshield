# PromptShield <img src="https://raw.githubusercontent.com/mayank1513/mayank1513/main/popper.png" style="height: 40px"/>

<p className="flex gap-2">
  <a href="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml" rel="noopener noreferrer">
    <img alt="CI" src="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://codecov.io/gh/promptshield-io/promptshield" rel="noopener noreferrer">
    <img alt="codecov" src="https://codecov.io/gh/promptshield-io/promptshield/graph/badge.svg" />
  </a>
  <img alt="license" src="https://img.shields.io/github/license/promptshield-io/promptshield" />
</p>

![PromptShield Banner](https://raw.githubusercontent.com/promptshield-io/promptshield/main/banner.gif)

> **The "Clean Room" for AI inputs.** A comprehensive security ecosystem to detect, visualize, and sanitize invisible threats in LLM prompts.

---

## 🛑 The Problem

LLM inputs are code. If you can't see the text, you can't trust the execution. Attackers use:

- **Invisible Characters**: Zero-width spaces (`\u200B`) to smuggle instructions past keyword filters.
- **Trojan Source**: BIDI overrides to make code look like it does one thing while doing another.
- **Homoglyphs**: Cyrillic `а` looking like Latin `a` to spoof trusted domains or commands.

PromptShield provides the tooling to detect these threats at every stage of your development lifecycle.

---

## 📦 Ecosystem

| Package                                             | Status                                                                                                                | Description                                                                            |
| :-------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| [**@promptshield/core**](./packages/core)           | [![npm](https://img.shields.io/npm/v/@promptshield/core)](https://www.npmjs.com/package/@promptshield/core)           | **The Engine.** Zero-dependency, high-performance threat detection logic.              |
| [**@promptshield/cli**](./packages/cli)             | [![npm](https://img.shields.io/npm/v/@promptshield/cli)](https://www.npmjs.com/package/@promptshield/cli)             | **The Gatekeeper.** CI/CD tool to block malicious prompts from entering your codebase. |
| [**@promptshield/vscode**](./packages/vscode)       | [![npm](https://img.shields.io/npm/v/@promptshield/vscode)](https://www.npmjs.com/package/@promptshield/vscode)       | **The Lens.** VS Code extension for real-time threat visualization (X-Ray Mode).       |
| [**@promptshield/lsp**](./packages/lsp)             | [![npm](https://img.shields.io/npm/v/@promptshield/lsp)](https://www.npmjs.com/package/@promptshield/lsp)             | **The Brain.** Language Server Protocol implementation for universal editor support.   |
| [**@promptshield/sanitizer**](./packages/sanitizer) | [![npm](https://img.shields.io/npm/v/@promptshield/sanitizer)](https://www.npmjs.com/package/@promptshield/sanitizer) | **The Cure.** Deterministic logic to strip invisible threats safely.                   |
| [**@promptshield/ignore**](./packages/ignore)       | [![npm](https://img.shields.io/npm/v/@promptshield/ignore)](https://www.npmjs.com/package/@promptshield/ignore)       | **The Filter.** Standardized syntax for suppressing false positives.                   |
| [**@promptshield/workspace**](./packages/workspace) | [![npm](https://img.shields.io/npm/v/@promptshield/workspace)](https://www.npmjs.com/package/@promptshield/workspace) | **The Orchestrator.** High-performance filesystem and caching engine.                  |

---

## ⚡ Quick Start

### For Developers (VS Code)

1.  Install the **[PromptShield Extension](https://marketplace.visualstudio.com/items?itemName=mayank1513.promptshield)**.
2.  Open any file. Invisible characters and threats are instantly highlighted.

### For CI/CD (CLI)

```bash
# Scan your prompts directory and fail if threats are found
npx promptshield-cli scan "prompts/**/*.txt" --check
```

### For Node.js Apps

```ts
import { scan } from "@promptshield/core";

const result = scan(userInput);
if (!result.isClean) {
  throw new Error("Security threat detected!");
}
```

---

## 🤝 Contributing

We welcome security researchers and engineers! This monorepo is managed with [Turbo](https://turbo.build/) and [PNPM](https://pnpm.io/).

1.  Clone the repo
2.  `pnpm install`
3.  `pnpm build`
4.  `pnpm test`

---

<p align="center">with 💖 by <a href="https://mayankchaudhari.com" target="_blank">Mayank Kumar Chaudhari</a></p>
