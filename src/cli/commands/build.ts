/// <reference types="bun" />
import { spawnSync } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface BuildOptions {
  readonly entry: string;
  readonly outdir: string;
  readonly minify: boolean;
  readonly cwd?: string;
  /** Original argv after `build` for Bun re-exec. */
  readonly rawArgs?: readonly string[];
}

function reexecWithBun(rawArgs: readonly string[]): never {
  const cli = fileURLToPath(import.meta.url);
  const result = spawnSync("bun", [cli, "build", ...rawArgs], {
    stdio: "inherit",
  });
  if (result.error) {
    console.error(
      "terella-action build requires Bun. Install from https://bun.sh then retry.",
    );
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

export async function runBuild(options: BuildOptions): Promise<void> {
  if (typeof Bun === "undefined") {
    reexecWithBun(options.rawArgs ?? []);
  }

  const cwd = options.cwd ?? process.cwd();
  const entry = resolve(cwd, options.entry);
  const outdir = resolve(cwd, options.outdir);

  await rm(outdir, { recursive: true, force: true });

  const result = await Bun.build({
    entrypoints: [entry],
    outdir,
    target: "node",
    sourcemap: "external",
    minify: options.minify,
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  await writeFile(
    resolve(outdir, "package.json"),
    `${JSON.stringify({ type: "module" }, null, 2)}\n`,
  );

  console.log(`Built ${options.entry} -> ${options.outdir}`);
}
