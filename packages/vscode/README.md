# promptshield <img src="https://raw.githubusercontent.com/mayank1513/mayank1513/main/popper.png" style="height: 40px"/>

![PromptShield Banner](./hero.gif)

<p className="flex gap-2">
  <a href="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml" rel="noopener noreferrer">
    <img alt="CI" src="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://codecov.io/gh/promptshield-io/promptshield/tree/main/packages/promptshield" rel="noopener noreferrer">
    <img alt="codecov" src="https://codecov.io/gh/promptshield-io/promptshield/graph/badge.svg?flag=promptshield" />
  </a> 
  <a href="https://marketplace.visualstudio.com/items?itemName=mayank1513.promptshield" rel="noopener noreferrer">
    <img alt="Visual Studio Marketplace Installs" src="https://img.shields.io/visual-studio-marketplace/i/mayank1513.promptshield">
  </a>
  <a href="https://open-vsx.org/extension/mayank1513/promptshield" rel="noopener noreferrer">
    <img alt="Open VSX Downloads" src="https://img.shields.io/open-vsx/dt/mayank1513/promptshield?label=OVSX%20Downloads">
  </a>
</p>

> **Real-time visual security** for prompt engineering. Detects and visualizes hidden "ghost" characters, directional overrides, and malicious Unicode within the VS Code editor.

---

## ✨ Features

- **X-Ray Vision**: Instantly reveals invisible characters (ZWSP, NBSP) and BIDI overrides with distinct decorations.
- **Real-Time Diagnostics**: Highlights threats with squiggly lines (Red for Critical, Yellow for High).
- **Quick Fixes**: One-click remediation for common threats (e.g., "Remove invisible character").
- **AI-Powered Fixes**: Leverages GitHub Copilot (or compatible LM) to semantically repair injected prompts.
- **Status Bar Integration**: Shows current file health at a glance.
- **Detailed Reports**: `Cmd+Shift+P` > `PromptShield: Show Detailed Report` to see a list of all threats in the file.
- **Workspace Scan**: Audit your entire project with a single command.

---

## 🚀 Usage

### Installation

Install via the Visual Studio Code Marketplace:
[**PromptShield on Marketplace**](https://marketplace.visualstudio.com/items?itemName=mayank1513.promptshield)

or via Open VSX Registry:
[**PromptShield on Open VSX**](https://open-vsx.org/extension/mayank1513/promptshield)

### Overview of Commands and Actions

The extension registers several commands accessible via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **`PromptShield: Scan Workspace`**
  - Triggers a highly concurrent, streaming scan of your entire project directory, respecting `.gitignore` and `.promptshieldignore`.
  - Automatically generates a detailed `workspace-report.md` in your `.promptshield` directory containing `file://` links to all discovered threats.
- **`PromptShield: Show Detailed Report`**
  - Opens a quick-pick list of all active threats in the currently focused file for rapid navigation.
- **`PromptShield: Toggle X-Ray`**
  - Toggles the inline ghost-text decorators that visually expose invisible characters like `[ZWSP]`.

#### Code Actions & Quick Fixes

When your cursor is over a highlighted threat, you can use the Quick Fix menu (`Cmd+.` / `Ctrl+.`) to access context-aware actions:

1. **Fix this issue / Fix all issues**: Immediately and deterministically removes the dangerous characters from the document without breaking surrounding text block shapes.
2. **Fix with AI (Copilot Integrated)**: For semantic threats (like encoded payloads or complex regex injections), this action bridges directly to GitHub Copilot (or your active Language Model) to intelligently rewrite the malicious prompt segment while preserving the original intent.
3. **Ignore this line**: Automatically injects a language-appropriate comment (e.g. `// promptshield-ignore next`) to suppress the warning.
4. **Remove unused ignore directive**: Keeps your codebase clean by offering to delete ignore comments that are no longer masking an active threat.

### Configuration

Customize detection rules in `.vscode/settings.json` or your User Settings:

```json
{
  "promptshield.enable": true,
  "promptshield.trace.server": "verbose"
}
```

---

## 🎨 Threat Visualization

- **Invisible Characters**: Rendered as `[ZWSP]`, `[NBSP]`, etc., with a ghost text overlay.
- **BIDI Overrides**: Highlighted to show where text direction is being manipulated.
- **Homoglyphs**: Flagged to prevent visual spoofing attacks.

---

## License

This library is licensed under the MIT open-source license.

<hr />

<p align="center">with 💖 by <a href="https://mayankchaudhari.com" target="_blank">Mayank Kumar Chaudhari</a></p>
