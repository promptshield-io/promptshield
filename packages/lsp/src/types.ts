export interface LspConfig {
  debounceMs: number;
}

export type ValidationContext = {};

export const DEFAULT_CONFIG: LspConfig = {
  debounceMs: 400,
};
