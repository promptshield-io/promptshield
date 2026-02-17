import { defineConfig, type Options } from "tsup";

export default defineConfig(
  (options: Options) =>
    ({
      format: ["cjs"],
      target: "es2022",
      dts: false, // VS Code doesn't need dts for running
      entry: {
        extension: "src/extension.ts",
        server: "src/server.ts",
      },
      external: ["vscode"],
      noExternal: ["@promptshield/core", "@promptshield/lsp"],
      sourcemap: !options.watch,
      clean: !options.watch,
      bundle: true,
      minify: !options.watch,
      metafile: true,
      treeshake: true,
      ...options,
    }) as Options,
);
