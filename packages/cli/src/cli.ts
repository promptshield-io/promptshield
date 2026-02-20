#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveFiles } from "@promptshield/workspace";
import { findProjectRoot, resolveConfig } from "@turbo-forge/cli-kit";
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
