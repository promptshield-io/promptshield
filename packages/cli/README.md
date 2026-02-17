# @promptshield/cli <img src="https://raw.githubusercontent.com/mayank1513/mayank1513/main/popper.png" style="height: 40px"/>

![PromptShield Banner](./banner.jpg)

<p className="flex gap-2">
  <a href="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml" rel="noopener noreferrer">
    <img alt="CI" src="https://github.com/promptshield-io/promptshield/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://codecov.io/gh/promptshield-io/promptshield/tree/main/packages/promptshield-cli" rel="noopener noreferrer">
    <img alt="codecov" src="https://codecov.io/gh/promptshield-io/promptshield/graph/badge.svg?flag=promptshield-cli" />
  </a> 
  <a href="https://npmjs.com/package/promptshield-cli" rel="noopener noreferrer">
    <img alt="npm version" src="https://img.shields.io/npm/v/promptshield-cli" />
  </a>
  <a href="https://npmjs.com/package/promptshield-cli" rel="noopener noreferrer">
    <img alt="npm downloads" src="https://img.shields.io/npm/d18m/promptshield-cli" />
  </a>
  <a href="https://npmjs.com/package/promptshield-cli" rel="noopener noreferrer">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/promptshield-cli" />
  </a>
  <img alt="license" src="https://img.shields.io/npm/l/promptshield-cli" />
</p>

> **production-grade CLI** for auditing AI prompts. Detects invisible characters, homoglyph attacks, and adversarial Unicode poisoning in your development workflow.

---

## ✨ Features

- **CI/CD Ready**: Exit codes for passing/failing builds based on threat severity.
- **Scanning**: Detect invisible characters, BIDI overrides, and homoglyphs.
- **Sanitization**: Automatically strip dangerous characters (where safe).
- **Configuration**: Support for `.promptshieldrc` and `.promptignore`.
- **JSON Output**: Machine-readable reports for dashboard integration.

---

## 📦 Installation

```bash
# Global installation
$ npm install -g @promptshield/cli

# Project dependency
$ pnpm add -D @promptshield/cli
```

---

## 🚀 Usage

### Basic Scan

Scan all files in the current directory (respects `.gitignore` and `.promptignore`).

```bash
$ promptshield scan
```

Scan specific files or globs:

```bash
$ promptshield scan "prompts/**/*.txt" "src/**/*.ts"
```

### Options

| Option | Description |
| :--- | :--- |
| `--check` | Fail (exit code 1) on the first detected threat. Ideal for CI. |
| `--json` | Output results in JSON format. |
| `--strict` | Enable stricter sanitization rules. |
| `--write` | Write fixes to disk (used with `fix` or `sanitize`). |
| `--config <file>` | Path to a specific config file. |
| `--init` | Generate a default configuration file. |

### Commands

#### `scan`
Analyzes files for threats without modifying them.

```bash
$ promptshield scan --json > report.json
```

#### `fix`
Applies safe automatic fixes to files.

```bash
$ promptshield fix --write
```

#### `sanitize`
Aggressively cleans text content (may be destructive for some binary/encoded data).

```bash
$ promptshield sanitize --write
```

---

## ⚙️ Configuration

Create a `promptshield.config.json` (or use `--init`):

```json
{
  "minSeverity": "HIGH",
  "disableHomoglyphs": false,
  "exclude": ["**/node_modules/**", "**/*.min.js"]
}
```

---

## License

This library is licensed under the MIT open-source license.

<hr />

<p align="center">with 💖 by <a href="https://mayankchaudhari.com" target="_blank">Mayank Kumar Chaudhari</a></p>
