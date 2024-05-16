import { defineConfig } from 'tsup';

export default defineConfig({
    format: ["cjs", "esm"],
    entry: ["./src/lib/index.ts"],
    dts: true,
    shims: true,
    skipNodeModulesBundle: true,
    clean: true
})