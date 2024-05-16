import { defineConfig } from "tsup";

export default defineConfig({
  format: ["cjs", "esm"],
  entry: ["src/lib/index.ts"],
  //   entry: ["src/lib/index.ts", "src/helpers/errors.ts"],
  //   entry: ["src/**/*.ts"],
  dts: true,
  shims: true,
  skipNodeModulesBundle: true,
  clean: true,
  outDir: "dist",
});
