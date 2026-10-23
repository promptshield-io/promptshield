# @promptshield/tiptap <img src="https://raw.githubusercontent.com/mayank1513/mayank1513/main/popper.png" style="height: 40px"/>

<p className="flex gap-2">
  <a href="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml" rel="noopener noreferrer">
    <img alt="CI" src="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://codecov.io/gh/promptshield-io/promptshield/tree/main/packages/@promptshield/tiptap" rel="noopener noreferrer">
    <img alt="codecov" src="https://codecov.io/gh/promptshield-io/promptshield/graph/badge.svg?flag=@promptshield/tiptap" />
  </a> 
  <a href="https://npmjs.com/package/@promptshield/tiptap" rel="noopener noreferrer">
    <img alt="npm version" src="https://img.shields.io/npm/v/@promptshield/tiptap" />
  </a>
  <a href="https://npmjs.com/package/@promptshield/tiptap" rel="noopener noreferrer">
    <img alt="npm downloads" src="https://img.shields.io/npm/d18m/@promptshield/tiptap" />
  </a>
  <a href="https://npmjs.com/package/@promptshield/tiptap" rel="noopener noreferrer">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/@promptshield/tiptap" />
  </a>
  <img alt="license" src="https://img.shields.io/npm/l/@promptshield/tiptap" />
</p>

> **@promptshield/tiptap**: Official Tiptap extension for PromptShield. Detect Trojan Source, Unicode smuggling, invisible characters, homoglyph attacks, and a small subset of well known injection phrases in real-time before text reaches your LLM or backend systems.

PromptShield provides **deterministic lexical security for LLM inputs**, identifying hidden or deceptive Unicode sequences that may manipulate AI prompts or application logic.

---

## ✨ Why @promptshield/tiptap?

- **Real-time Threat Detection:** Scans editor content for hidden or deceptive Unicode sequences as the user types or pastes text.
- **Built-in UI:** Adds visual decorations (wavy underline) and hover tooltips to highlight suspicious characters directly in the editor.
- **Quick Fixes:** Provides programmatic APIs to sanitize detected threats such as invisible characters or Unicode spoofing.
- **Ignore Directives:** Supports inline ignore directives (e.g. `// promptshield-ignore`) similar to the PromptShield VS Code extension.
- **Debounced Scanning:** Efficient scanning with configurable debounce intervals to keep editing smooth even with large documents.
- **AI Co-editing Ready:** Ideal for editors that feed user input into LLMs, preventing hidden prompt manipulation before submission.

---

## 🛡 What Attacks Are Detected?

See [`@promptshield/core`](https://www.npmjs.com/package/@promptshield/core)

---

## 📦 Installation

```bash
$ pnpm add @promptshield/tiptap
```

**_or_**

```bash
$ npm install @promptshield/tiptap
```

**_or_**

```bash
$ yarn add @promptshield/tiptap
```

---

## 🚀 Usage

```typescript
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { PromptShield } from "@promptshield/tiptap";

// Optionally inject basic styles for the decorations and tooltips
import "@promptshield/tiptap/style.css";

const editor = new Editor({
  extensions: [
    Document,
    Paragraph,
    Text,
    PromptShield.configure({
      // Configure options (defaults shown)
      scanOnUpdate: true, // Scan dynamically as content changes
      scanOnPaste: true, // Ensure pasted content is evaluated
      debounceMs: 300, // Debounce intervals to optimize performance
      hoverUi: true, // Toggle the tooltip UI
      noInlineIgnore: false, // Allow inline ignore directives
    }),
  ],
  content: "<p>Hello World</p>",
});
```

When a suspicious sequence is detected:
- The text is visually highlighted in the editor
- Hovering reveals the detected threat and explanation
- Developers can programmatically sanitize the content if needed

---

## 🤖 AI Co-Editing & LLM Interfaces

If your editor feeds user content into an AI model, hidden Unicode manipulation can silently alter prompts.

Typical attack flow:

```
User pastes malicious content
        ↓
Invisible Unicode characters hide instructions
        ↓
LLM receives manipulated prompt
        ↓
Unexpected or unsafe model output
```

`@promptshield/tiptap` detects and highlights these threats **before the user submits the content**, allowing them to review or sanitize it locally.

`@promptshield/tiptap` is incredibly suited for robust User-to-LLM interfaces. If you are building a chat interface or a co-pilot editor using TipTap:
1. **Prevent Attack Propagation:** If an end-user maliciously pastes hidden ZWSP sequences or homoglyphs targeting the AI model.
2. **Warn the User:** The immediate visual threat highlights enable the user to automatically rewrite or remove the hidden logic _before_ clicking submit.
3. **Seamlessly Fix:** Quick fix actions natively remove invisible characters or normalize strings locally.

---

## License

MIT License.

<hr />

<p align="center">with 💖 by <a href="https://mayankchaudhari.com" target="_blank">Mayank Chaudhari</a></p>
