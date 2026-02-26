#!/usr/bin/env node

/**
 * -----------------------------------------------------------------------------
 * PromptShield CLI Entry
 * -----------------------------------------------------------------------------
 *
 * Production-grade CLI bootstrap for PromptShield.
 *
 * Responsibilities
 * ---------------
 * - Parse and validate CLI arguments
 * - Initialize configuration files
 * - Resolve layered configuration (defaults → config file → CLI overrides)
 * - Delegate execution to `runPromptShield`
 *
 * Non-Responsibilities
 * --------------------
 * - Threat detection logic (@promptshield/core)
 * - Workspace traversal and caching (@promptshield/workspace)
 * - Reporting and diagnostics formatting
 *
 * Design Principles
 * -----------------
 * - Side-effect free argument parsing
 * - Deterministic configuration resolution
 * - Clear separation of command routing vs execution
 * - CI-safe (no process.exit inside library code)
 *
 * This file intentionally contains zero detection logic.
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CacheMode } from "@promptshield/workspace";
import { findProjectRoot, resolveConfig } from "@turbo-forge/cli-kit";
import {
  DEFAULT_CONFIG,
  type PromptshieldCliOptions,
  runPromptShield,
} from "./main";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * CLI-only flags layered on top of runtime options.
 */
export interface CliOptions extends PromptshieldCliOptions {
  /**
   * Display help documentation and exit.
   */
  help?: boolean;

  /**
   * Initialize a default configuration file.
   */
  init?: boolean;

  /**
   * Path to configuration file.
   */
  config?: string;
}

/* -------------------------------------------------------------------------- */
/* Argument Parsing                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Parses raw CLI arguments into structured options.
 *
 * Behavior:
 * - Stateless
 * - Does not validate semantic correctness
 * - Does not perform I/O
 *
 * @example
 * parseArgs(["scan", "src", "--json"])
 */
export const parseArgs = (args: string[]): Partial<CliOptions> => {
  const options: Partial<CliOptions> = {};
  const patterns: string[] = [];

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

      case "--cache-mode":
      case "-m":
        if (["none", "single", "split", "auto"].includes(args[i + 1])) {
          options.cacheMode = args[++i] as CacheMode;
        }
        break;

      case "--force-full-scan":
      case "-f":
        options.forceFullScan = true;
        break;

      case "--report":
      case "-r":
        options.report = true;
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

      case "--no-inline-ignore":
        options.noInlineIgnore = true;
        break;

      case "scan":
      case "fix":
      case "sanitize":
        options.command = arg;
        break;

      default:
        if (!arg.startsWith("--")) {
          patterns.push(arg);
        }
    }
  }

  if (patterns.length) options.patterns = patterns;

  return options;
};

/* -------------------------------------------------------------------------- */
/* Help Documentation                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Displays CLI usage documentation.
 *
 * Intentionally verbose for enterprise onboarding clarity.
 */
export const showHelp = (): void => {
  console.log(`
PromptShield CLI — Detect, Fix & Sanitize Prompt Injection Threats

USAGE
  promptshield <command> [patterns/files...] [options]

COMMANDS
  scan        Analyze files and report threats (default)
  fix         Apply safe, automatic remediations
  sanitize    Normalize and clean textual content

PATTERNS
  File paths or glob patterns (default: [**/*])

OPTIONS
  -c, --config <file>        Use custom configuration file
  -i, --init [file]          Create default config (optional filename)

  -m, --cache-mode <mode>    Caching strategy:
                               none   → no cache
                               single → single file cache
                               split  → per-file cache
                               auto   → adaptive (recommended)

  -f, --force-full-scan      Ignore cache and rescan everything
  -r, --report               Generate Markdown report
      --json                 JSON output (scan only)
      --write                Persist fixes to disk
      --strict               Strict sanitization rules
      --check                CI mode (fail on first threat)
      --no-inline-ignore     Disable inline ignore directives

  -h, --help                 Show this help

CI EXAMPLE
  promptshield scan --check

INITIALIZATION
  promptshield --init
  promptshield --init promptshield.config.json

CACHE STRATEGY GUIDANCE
  - small repos (<200 files): single
  - large repos: split or auto
  - CI pipelines: auto + force-full-scan (recommended)

More: https://github.com/promptshield
`);
};

/* -------------------------------------------------------------------------- */
/* Main Execution                                                             */
/* -------------------------------------------------------------------------- */

/**
 * CLI execution entry.
 *
 * Flow:
 * 1. Resolve project root
 * 2. Parse CLI args
 * 3. Handle help/init early exits
 * 4. Resolve layered configuration
 * 5. Delegate to runtime
 */
export const main = async (
  args: string[] = process.argv.slice(2),
): Promise<void> => {
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
    console.log(`✔ Created config file at ${file}`);
    return;
  }

  const config = await resolveConfig<CliOptions>({
    name: "promptshield",
    defaults: DEFAULT_CONFIG,
    cliArgs,
    configFile,
  });

  await runPromptShield(config);
};

/* -------------------------------------------------------------------------- */
/* CLI Bootstrap Guard                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Ensures execution only when invoked directly via Node.
 * Prevents accidental execution when imported as a module.
 */
const isCLI =
  typeof require !== "undefined"
    ? require.main === module
    : fileURLToPath(import.meta.url) === process.argv[1];

if (isCLI) {
  main().catch(console.error);
}
