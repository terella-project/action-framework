/// <reference types="bun" />
import { chmod, mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

interface ActionSpec {
  name: string;
  entry: string;
  outdir: string;
}

const ACTIONS: ActionSpec[] = [
  { name: "ci", entry: "actions/ci/src/index.ts", outdir: "actions/ci/dist" },
  {
    name: "auto-tag",
    entry: "actions/auto-tag/src/index.ts",
    outdir: "actions/auto-tag/dist",
  },
  {
    name: "update-outdated-prs",
    entry: "actions/update-outdated-prs/src/index.ts",
    outdir: "actions/update-outdated-prs/dist",
  },
  {
    name: "dependabot-auto-merge",
    entry: "actions/dependabot-auto-merge/src/index.ts",
    outdir: "actions/dependabot-auto-merge/dist",
  },
  {
    name: "publish",
    entry: "actions/publish/src/index.ts",
    outdir: "actions/publish/dist",
  },
  {
    name: "supervisor",
    entry: "actions/supervisor/src/index.ts",
    outdir: "actions/supervisor/dist",
  },
  {
    name: "codeql",
    entry: "actions/codeql/src/index.ts",
    outdir: "actions/codeql/dist",
  },
];

async function buildAction(spec: ActionSpec): Promise<void> {
  await rm(spec.outdir, { recursive: true, force: true });

  const result = await Bun.build({
    entrypoints: [spec.entry],
    outdir: spec.outdir,
    target: "node",
    format: "esm",
    packages: "external",
    sourcemap: "external",
    minify: true,
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const onlyName = process.argv[2];
  const specs = onlyName ? ACTIONS.filter((s) => s.name === onlyName) : ACTIONS;
  if (specs.length === 0) {
    console.error(`Unknown action: ${onlyName}`);
    console.error(`Available: ${ACTIONS.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }

  for (const spec of specs) {
    await buildAction(spec);
    console.log(`Built ${spec.name} -> ${spec.outdir}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
