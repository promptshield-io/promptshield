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

> **@promptshield/tiptap**: Official Tiptap extension for PromptShield. Protect your editor from Prompt Injection and Trojan Source attacks in real-time.

---

## ✨ Why @promptshield/tiptap?

- **Real-time Threat Detection:** Scans text for Homoglyphs, Invisible Characters, Unicode Smuggling, and Trojan Source vulnerabilities as the user types.
- **Built-in UI:** Provides out-of-the-box text decorations (wavy underlines) and hover tooltips for visual feedback.
- **Quick Fixes:** Empowers users to automatically sanitize and fix detected threats programmatically directly within the editor.
- **Ignore Directives:** Supports inline ignore directives (e.g. `// promptshield-ignore`), mirroring the VS Code extension natively.
- **Debounced Scanning:** Optimized for performance even with documents up to 50k+ characters. No freezing on keystrokes.
- **AI Co-editing Ready:** Ideal for AI text-completion editors, preventing invisible manipulation or "jailbreak" injections from pasting into sensitive LLM input forms.

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
      scanOnUpdate: true,      // Scan dynamically as content changes
      scanOnPaste: true,       // Ensure pasted content is evaluated
      debounceMs: 300,         // Debounce intervals to optimize performance
      hoverUi: true,           // Toggle the tooltip UI
      noInlineIgnore: false,   // Allow the use of inline ignore directives
    }),
  ],
  content: "<p>Hello World</p>",
});
```

### 🤖 AI Co-Editing & LLM Interfaces
`@promptshield/tiptap` is incredibly suited for robust User-to-LLM interfaces. If you are building a chat interface or a co-pilot editor using TipTap:
1. **Prevent Attack Propagation:** If an end-user maliciously pastes hidden ZWSP sequences or homoglyphs targeting the AI model. 
2. **Warn the User:** The immediate visual threat highlights enable the user to automatically rewrite or remove the hidden logic *before* clicking submit.
3. **Seamlessly Fix:** Quick fix actions natively remove invisible characters or normalize strings locally.

## License

This library is licensed under the MIT open-source license.

<hr />

<p align="center">with 💖 by <a href="https://mayankchaudhari.com" target="_blank">Mayank Kumar Chaudhari</a></p>
