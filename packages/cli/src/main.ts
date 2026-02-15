import { createLogger, deepMerge, type LogLevel } from "@turbo-forge/cli-kit";

export interface PromptshieldCliOptions {
  logLevel?: LogLevel;
}

export const DEFAULT_CONFIG: Required<PromptshieldCliOptions> = {
  logLevel: "info",
};

export const promptshieldCli = async (options: PromptshieldCliOptions) => {
  const config = deepMerge(
    DEFAULT_CONFIG,
    options,
  ) as Required<PromptshieldCliOptions>;
  const logger = createLogger({ level: config.logLevel });
  logger.info("Hello from promptshieldCli!");
};
