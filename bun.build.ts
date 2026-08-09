/// <reference types="bun" />
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outdir = "dist";
const entrypoints = [
  "./src/index.ts",
  "./src/action-runtime.ts",
  "./src/action-composition.ts",
  "./src/action-services.ts",
  "./src/exec-client.ts",
];

await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints,
  outdir,
  target: "node",
  format: "esm",
  splitting: true,
  packages: "external",
  sourcemap: "linked",
  naming: {
    entry: "[name].[ext]",
  },
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Use the local `typescript` package binary — never `bunx tsc` / `npx tsc`,
// which can fetch the unrelated `tsc` package from npm.
const tscBin = Bun.resolveSync("typescript/bin/tsc", import.meta.dir);
const tsc = Bun.spawn([tscBin, "-p", "tsconfig.emit.json"], {
  stdout: "inherit",
  stderr: "inherit",
});
const tscCode = await tsc.exited;
if (tscCode !== 0) {
  process.exit(tscCode);
}

// Declaration emit preserves extensionless relative paths; Node-friendly
// consumers expect .js specifiers in .d.ts (same as the JS bundles Bun wrote).
for (const name of await readdir(outdir)) {
  if (!name.endsWith(".d.ts")) continue;
  const path = join(outdir, name);
  const original = await readFile(path, "utf8");
  const updated = original.replace(
    /((?:import|export)(?:\s+type)?[\s\S]*?\sfrom\s+)(["'])(\.[^"']+)\2/g,
    (match, prefix: string, quote: string, spec: string) => {
      if (/\.[cm]?[jt]sx?$/.test(spec) || /\.json$/.test(spec)) {
        return match;
      }
      return `${prefix}${quote}${spec}.js${quote}`;
    },
  );
  if (updated !== original) {
    await writeFile(path, updated);
  }
}

console.log(`Built ${entrypoints.length} entrypoints -> ${outdir}/`);
