import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, basename } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { scaffoldFiles, type ScaffoldOptions } from "../templates/scaffold.js";

export interface InitOptions {
  readonly dir: string;
  readonly name?: string;
  readonly description?: string;
  readonly author?: string;
  readonly yes: boolean;
  readonly force: boolean;
  readonly sampleInput: boolean;
  readonly githubWorkflow: boolean;
  readonly cwd?: string;
}

async function frameworkVersion(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/cli/index.js -> ../../package.json; src path during tests may differ
  const candidates = [
    join(here, "../../package.json"),
    join(here, "../../../package.json"),
  ];
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf8");
      const pkg = JSON.parse(raw) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      // try next
    }
  }
  return "0.0.1";
}

async function isEmptyDir(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length === 0;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return true;
    throw error;
  }
}

async function prompt(
  question: string,
  fallback: string,
  interactive: boolean,
): Promise<string> {
  if (!interactive) return fallback;
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(`${question} (${fallback}): `)).trim();
    return answer || fallback;
  } finally {
    rl.close();
  }
}

function toPackageName(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._~/-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "my-action";
}

export async function runInit(options: InitOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const targetDir = resolve(cwd, options.dir);
  const interactive = !options.yes && Boolean(input.isTTY);

  if (!(await isEmptyDir(targetDir)) && !options.force) {
    console.error(
      `Refusing to write into non-empty directory: ${targetDir}\nRe-run with --force to overwrite scaffold files.`,
    );
    process.exit(1);
  }

  const defaultName = options.name ?? basename(targetDir);
  const name = await prompt("Action name", defaultName, interactive);
  const description = await prompt(
    "Description",
    options.description ?? "A GitHub Action built with @terella/action-framework",
    interactive,
  );
  const author = options.author
    ? options.author
    : await prompt("Author (optional)", "", interactive);

  const scaffold: ScaffoldOptions = {
    name,
    description,
    author,
    packageName: toPackageName(name),
    frameworkVersion: await frameworkVersion(),
    sampleInput: options.sampleInput,
    githubWorkflow: options.githubWorkflow,
  };

  const files = scaffoldFiles(scaffold);
  await mkdir(join(targetDir, "src"), { recursive: true });

  for (const file of files) {
    const path = join(targetDir, file.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.content);
    console.log(`created ${file.path}`);
  }

  console.log(`\nAction ready in ${targetDir}`);
  console.log("Next:");
  console.log(`  cd ${options.dir === "." ? "." : options.dir}`);
  console.log("  bun install");
  console.log("  bun run build");
}
