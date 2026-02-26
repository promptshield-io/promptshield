# @promptshield/sanitizer <img src="https://raw.githubusercontent.com/mayank1513/mayank1513/main/popper.png" style="height: 40px"/>

![PromptShield Banner](https://raw.githubusercontent.com/promptshield-io/promptshield/main/banner.jpg)

<p className="flex gap-2">
  <a href="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml" rel="noopener noreferrer">
    <img alt="CI" src="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://codecov.io/gh/promptshield-io/promptshield/tree/main/packages/@promptshield/sanitizer" rel="noopener noreferrer">
    <img alt="codecov" src="https://codecov.io/gh/promptshield-io/promptshield/graph/badge.svg?flag=@promptshield/sanitizer" />
  </a> 
  <a href="https://npmjs.com/package/@promptshield/sanitizer" rel="noopener noreferrer">
    <img alt="npm version" src="https://img.shields.io/npm/v/@promptshield/sanitizer" />
  </a>
  <a href="https://npmjs.com/package/@promptshield/sanitizer" rel="noopener noreferrer">
    <img alt="npm downloads" src="https://img.shields.io/npm/d18m/@promptshield/sanitizer" />
  </a>
  <a href="https://npmjs.com/package/@promptshield/sanitizer" rel="noopener noreferrer">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/@promptshield/sanitizer" />
  </a>
  <img alt="license" src="https://img.shields.io/npm/l/@promptshield/sanitizer" />
</p>

> **Deterministic sanitizer** for prompt hygiene. Applies safe, idempotent text transformations to remove invisible threats and normalization artifacts.

---

## ✨ Features

- **Safe Defaults**: Removes only objectively dangerous characters (BOM, ZWSP, control chars).
- **Idempotent**: Running it twice produces the same result.
- **Strict Mode**: Optional NFKC normalization for aggressive cleaning.
- **Zero-Dependency**: Lightweight and fast.

---

## 📦 Installation

```bash
$ pnpm add @promptshield/sanitizer
```

---

## 🚀 Usage

<details>
<summary>View complete usage and exact removal rules</summary>

```ts
import { sanitize, sanitizeStrict } from "@promptshield/sanitizer";

const dirty = "Hello\u200BWorld"; // Contains Zero-Width Space

// Safe sanitize (removes invisible chars)
const clean = sanitize(dirty);
console.log(clean); // "HelloWorld"

// Strict sanitize (also applies NFKC normalization)
const strict = sanitizeStrict("ℍ𝕖𝕝𝕝𝕠");
console.log(strict); // "Hello"
```

### What gets removed?

1.  **Invisible Characters**: `\u200B` (ZWSP), `\u200C` (ZWNJ), `\u200D` (ZWJ), etc.
2.  **Byte Order Marks**: `\uFEFF`.
3.  **Variation Selectors**: `\uFE00`-`\uFE0F` (often used to break tokenizers).
4.  **Markdown Comments**: `<!-- hidden payload -->`.
5.  **Empty Links**: `[](javascript:...)`.

</details>

> 📚 **Deep Dives**: For the exact execution order of the sanitization pipeline and understanding `applyFixes`, see the [Documentation section](https://promptshield.js.org/docs/sanitizer).

---

## License

This library is licensed under the MIT open-source license.

<hr />

<p align="center">with 💖 by <a href="https://mayankchaudhari.com" target="_blank">Mayank Kumar Chaudhari</a></p>
