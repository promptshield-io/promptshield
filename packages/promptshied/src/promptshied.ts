import { createLogger, deepMerge, type LogLevel } from "@turbo-forge/cli-kit";

export interface PromptshiedOptions {
  logLevel?: LogLevel;
}

export const DEFAULT_CONFIG: Required<PromptshiedOptions> = {
  logLevel: "info",
};

export const promptshied = async (options: PromptshiedOptions) => {
  const config = deepMerge(
    DEFAULT_CONFIG,
    options,
  ) as Required<PromptshiedOptions>;
  const logger = createLogger({ level: config.logLevel });
  logger.info("Hello from promptshied!");
};
