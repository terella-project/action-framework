/// <reference types="bun" />
import { chmod, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const outdir = "dist";
const libraryEntrypoints = [
  "./src/index.ts",
  "./src/action-runtime.ts",
  "./src/action-composition.ts",
  "./src/action-services.ts",
  "./src/exec-client.ts",
];

await rm(outdir, { recursive: true, force: true });

const library = await Bun.build({
  entrypoints: libraryEntrypoints,
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

if (!library.success) {
  for (const log of library.logs) {
    console.error(log);
  }
  process.exit(1);
}

const cli = await Bun.build({
  entrypoints: ["./src/cli/index.ts"],
  outdir: join(outdir, "cli"),
  target: "node",
  format: "esm",
  packages: "bundle",
  sourcemap: "linked",
  naming: {
    entry: "index.[ext]",
  },
  banner: "#!/usr/bin/env node",
});

if (!cli.success) {
  for (const log of cli.logs) {
    console.error(log);
  }
  process.exit(1);
}

await chmod(join(outdir, "cli", "index.js"), 0o755);

// Use the local `typescript` package binary — never `bunx tsc` / `npx tsc`,
// which can fetch the unrelated `tsc` package from npm.
// Resolve via package.json (exported in TS 7+); `typescript/bin/tsc` is not
// in the package "exports" map so Bun.resolveSync rejects it.
const tscBin = join(
  dirname(Bun.resolveSync("typescript/package.json", import.meta.dir)),
  "bin",
  "tsc",
);
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

console.log(
  `Built ${libraryEntrypoints.length} library entrypoints + cli -> ${outdir}/`,
);
