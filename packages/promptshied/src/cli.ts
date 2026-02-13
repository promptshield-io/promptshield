#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findProjectRoot, resolveConfig } from "@turbo-forge/cli-kit";
import {
  DEFAULT_CONFIG,
  type PromptshiedOptions,
  promptshied,
} from "./promptshied";

export interface CliOptions extends PromptshiedOptions {
  help?: boolean;
  init?: boolean;
  config?: string;
}

export const parseArgs = (args: string[]): Partial<CliOptions> => {
  const options: Partial<CliOptions> = {};

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
        // Check if next arg is a filename (not starting with --)
        if (args[i + 1] && !args[i + 1].startsWith("--")) {
          options.config = args[++i];
        }
        break;
      case "--config":
      case "-c":
        options.config = args[++i];
        break;
    }
  }

  return options;
};

export const showHelp = () => {
  console.log(`
Usage: promptshied [options]

Options:
  -h, --help              Show this help message
  -i, --init [file]       Create default config file (optionally specify filename)
  -c, --config <file>     Use custom config file
`);
};

export const main = async (args: string[] = process.argv.slice(2)) => {
  const { help, init, config: configFile, ...cliArgs } = parseArgs(args);

  if (help) {
    showHelp();
    return;
  }

  if (init) {
    await writeFile(
      resolve(findProjectRoot(), configFile || "promptshied.config.json"),
      JSON.stringify(DEFAULT_CONFIG, null, 2),
    );
    console.log(
      `Created default config file at ${configFile || "promptshied.config.json"}`,
    );
    return;
  }

  const config = await resolveConfig<CliOptions>({
    name: "promptshied",
    defaults: DEFAULT_CONFIG,
    cliArgs,
    configFile,
  });

  await promptshied(config);
};

const isCLI =
  typeof require !== "undefined"
    ? require.main === module
    : fileURLToPath(import.meta.url) === process.argv[1];

if (isCLI) {
  main().catch(console.error);
}
