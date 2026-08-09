import { runBuild } from "./commands/build.js";
import { runInit } from "./commands/init.js";

function printHelp(): void {
  console.log(`terella-action — scaffold and build GitHub Actions

Usage:
  terella-action <command> [options]

Commands:
  init [dir]     Create a new action package (interactive or flagged)
  build          Bundle an action entrypoint for GitHub Actions (requires Bun)

init options:
  --name <name>
  --description <text>
  --author <text>
  --yes                 No prompts; use flags and defaults
  --force               Allow writing into a non-empty directory
  --no-sample-input     Omit the sample "name" input
  --workflow            Also write .github/workflows/<name>.yml

build options:
  [entry]               Entrypoint (default: src/index.ts)
  [outdir]              Output directory (default: dist)
  --minify

Examples:
  bunx @terella/action-framework init my-action --yes --workflow
  terella-action build
  terella-action build src/index.ts dist --minify
`);
}

function takeFlagValue(
  args: string[],
  index: number,
): { value: string; nextIndex: number } {
  const current = args[index] ?? "";
  const eq = current.indexOf("=");
  if (eq !== -1) {
    return { value: current.slice(eq + 1), nextIndex: index };
  }
  const next = args[index + 1];
  if (!next || next.startsWith("-")) {
    console.error(`Missing value for ${current.split("=")[0]}`);
    process.exit(1);
  }
  return { value: next, nextIndex: index + 1 };
}

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  if (
    !command ||
    command === "-h" ||
    command === "--help" ||
    command === "help"
  ) {
    printHelp();
    return;
  }

  if (command === "init") {
    let dir = ".";
    let name: string | undefined;
    let description: string | undefined;
    let author: string | undefined;
    let yes = false;
    let force = false;
    let sampleInput = true;
    let githubWorkflow = false;

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i]!;
      if (arg === "--yes" || arg === "-y") {
        yes = true;
        continue;
      }
      if (arg === "--force") {
        force = true;
        continue;
      }
      if (arg === "--no-sample-input") {
        sampleInput = false;
        continue;
      }
      if (arg === "--workflow") {
        githubWorkflow = true;
        continue;
      }
      if (arg === "--name" || arg.startsWith("--name=")) {
        const taken = takeFlagValue(rest, i);
        name = taken.value;
        i = taken.nextIndex;
        continue;
      }
      if (arg === "--description" || arg.startsWith("--description=")) {
        const taken = takeFlagValue(rest, i);
        description = taken.value;
        i = taken.nextIndex;
        continue;
      }
      if (arg === "--author" || arg.startsWith("--author=")) {
        const taken = takeFlagValue(rest, i);
        author = taken.value;
        i = taken.nextIndex;
        continue;
      }
      if (arg === "-h" || arg === "--help") {
        printHelp();
        return;
      }
      if (arg.startsWith("-")) {
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
      }
      dir = arg;
    }

    await runInit({
      dir,
      name,
      description,
      author,
      yes,
      force,
      sampleInput,
      githubWorkflow,
    });
    return;
  }

  if (command === "build") {
    let entry = "src/index.ts";
    let outdir = "dist";
    let minify = false;
    const positionals: string[] = [];

    for (const arg of rest) {
      if (arg === "--minify") {
        minify = true;
        continue;
      }
      if (arg === "-h" || arg === "--help") {
        printHelp();
        return;
      }
      if (arg.startsWith("-")) {
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
      }
      positionals.push(arg);
    }

    if (positionals[0]) entry = positionals[0];
    if (positionals[1]) outdir = positionals[1];

    await runBuild({ entry, outdir, minify, rawArgs: rest });
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
