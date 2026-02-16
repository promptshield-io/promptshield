#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findProjectRoot, resolveConfig } from "@turbo-forge/cli-kit";
import fg from "fast-glob";
import ignore from "ignore";
import {
  DEFAULT_CONFIG,
  type PromptshieldCliOptions,
  runPromptShield,
} from "./main";

export interface CliOptions extends PromptshieldCliOptions {
  help?: boolean;
  init?: boolean;
  config?: string;
}

/* -------------------------------------------------------------------------- */
/* Ignore loading                                                             */
/* -------------------------------------------------------------------------- */

const loadIgnore = async (root: string) => {
  const ig = ignore();

  const tryLoad = async (file: string) => {
    try {
      const content = await readFile(join(root, file), "utf-8");
      ig.add(content);
    } catch {
      // ignore missing files
    }
  };

  await tryLoad(".gitignore");
  await tryLoad(".promptshieldignore");
  await tryLoad(".psignore");

  return ig;
};

/* -------------------------------------------------------------------------- */
/* File resolution                                                            */
/* -------------------------------------------------------------------------- */

const resolveFiles = async (patterns: string[], root: string) => {
  if (!patterns.length) {
    patterns = ["**/*.{ts,tsx,js,jsx,md,txt,json}"];
  }

  const ig = await loadIgnore(root);

  const files = await fg(patterns, {
    cwd: root,
    dot: false,
    onlyFiles: true,
    absolute: true,
  });

  return files.filter(
    (f) => !ig.ignores(f.replace(root, "").replace(/^(\/|\\)/, "")),
  );
};

/* -------------------------------------------------------------------------- */
/* Arg parsing                                                                */
/* -------------------------------------------------------------------------- */

export const parseArgs = (args: string[]): Partial<CliOptions> => {
  const options: Partial<CliOptions> = {};
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;

      case "--init":
      case "-i":
        options.init = true;
        if (args[i + 1] && !args[i + 1].startsWith("--")) {
          options.config = args[++i];
        }
        break;

      case "--config":
      case "-c":
        options.config = args[++i];
        break;

      case "--write":
        options.write = true;
        break;

      case "--json":
        options.json = true;
        break;

      case "--strict":
        options.strict = true;
        break;

      case "--check":
        options.check = true;
        break;

      case "scan":
      case "fix":
      case "sanitize":
        options.command = arg;
        break;

      default:
        if (!arg.startsWith("--")) {
          files.push(arg);
        }
    }
  }

  if (files.length) options.files = files;

  return options;
};

/* -------------------------------------------------------------------------- */
/* Help                                                                       */
/* -------------------------------------------------------------------------- */

export const showHelp = () => {
  console.log(`
PromptShield CLI

Usage:
  promptshield <command> [files]

Commands:
  scan        Scan files for threats
  fix         Apply safe automatic fixes
  sanitize    Clean text content

Options:
  --write     Write changes to disk
  --json      JSON output (scan)
  --strict    Strict sanitization
  --check     Fail on first threat (CI mode)
  -h, --help  Show help
`);
};

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export const main = async (args: string[] = process.argv.slice(2)) => {
  const root = findProjectRoot();

  const { help, init, config: configFile, ...cliArgs } = parseArgs(args);

  if (help) {
    showHelp();
    return;
  }

  if (init) {
    const file = configFile || "promptshield.config.json";
    await writeFile(
      resolve(root, file),
      JSON.stringify(DEFAULT_CONFIG, null, 2),
    );
    console.log(`Created config file at ${file}`);
    return;
  }

  const config = await resolveConfig<CliOptions>({
    name: "promptshield",
    defaults: DEFAULT_CONFIG,
    cliArgs,
    configFile,
  });

  config.files = await resolveFiles(config.files ?? [], root);

  await runPromptShield(config);
};

/* -------------------------------------------------------------------------- */
/* CLI entry                                                                  */
/* -------------------------------------------------------------------------- */

const isCLI =
  typeof require !== "undefined"
    ? require.main === module
    : fileURLToPath(import.meta.url) === process.argv[1];

if (isCLI) {
  main().catch(console.error);
}
