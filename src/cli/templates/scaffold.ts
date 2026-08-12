export interface ScaffoldOptions {
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly packageName: string;
  readonly frameworkVersion: string;
  readonly sampleInput: boolean;
  readonly githubWorkflow: boolean;
}

export interface ScaffoldFile {
  readonly path: string;
  readonly content: string;
}

function workflowClassName(name: string): string {
  const parts = name
    .replace(/[@/]/g, "-")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const base = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `${base || "Action"}Workflow`;
}

export function workflowSource(options: ScaffoldOptions): string {
  const className = workflowClassName(options.name);
  if (options.sampleInput) {
    return `import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  Inject,
  InjectableWorkflow,
} from "@terella/action-framework";

@InjectableWorkflow()
export class ${className} {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
  ) {}

  async run(): Promise<void> {
    const name = this.runtime.getInput("name") || "World";
    this.runtime.info(\`Hello, \${name}!\`);
    this.runtime.setOutput("message", \`Hello, \${name}!\`);
  }
}
`;
  }

  return `import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  Inject,
  InjectableWorkflow,
} from "@terella/action-framework";

@InjectableWorkflow()
export class ${className} {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
  ) {}

  async run(): Promise<void> {
    this.runtime.info("Action started");
    this.runtime.setOutput("status", "completed");
  }
}
`;
}

export function indexSource(options: ScaffoldOptions): string {
  const className = workflowClassName(options.name);
  return `import {
  createActionComposition,
  runComposedAction,
} from "@terella/action-framework";
import { ${className} } from "./workflow.js";

const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

runComposedAction(composition, ${className}).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
`;
}

export function actionYml(options: ScaffoldOptions): string {
  const inputs = options.sampleInput
    ? `inputs:
  name:
    description: "Who to greet"
    required: false
    default: "World"
`
    : "";
  const outputs = options.sampleInput
    ? `outputs:
  message:
    description: "Greeting message"
`
    : `outputs:
  status:
    description: "Run status"
`;

  return `name: "${options.name}"
description: "${options.description.replace(/"/g, '\\"')}"
${options.author ? `author: "${options.author.replace(/"/g, '\\"')}"\n` : ""}${inputs}${outputs}runs:
  using: "node20"
  main: "dist/index.js"
`;
}

export function packageJson(options: ScaffoldOptions): string {
  return `${JSON.stringify(
    {
      name: options.packageName,
      version: "0.1.0",
      private: true,
      description: options.description,
      type: "module",
      scripts: {
        build: "terella-action build",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@terella/action-framework": `^${options.frameworkVersion}`,
      },
      devDependencies: {
        "@types/node": "^20.14.0",
        typescript: "^5.6.3",
      },
      ...(options.author ? { author: options.author } : {}),
    },
    null,
    2,
  )}\n`;
}

export function tsconfigJson(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        lib: ["ES2022"],
        types: ["node"],
        strict: true,
        esModuleInterop: true,
        experimentalDecorators: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        rootDir: "src",
      },
      include: ["src/**/*"],
    },
    null,
    2,
  )}\n`;
}

export function gitignore(): string {
  return `node_modules/
dist/
.env
*.log
`;
}

export function envExample(options: ScaffoldOptions): string {
  return options.sampleInput
    ? `INPUT_NAME=World
GITHUB_REPOSITORY=owner/repo
`
    : `GITHUB_REPOSITORY=owner/repo
`;
}

export function packageReadme(options: ScaffoldOptions): string {
  const workflowHint = options.githubWorkflow
    ? `\nA starter workflow is in \`.github/workflows/${toWorkflowFileName(options.name)}.yml\`.\n`
    : "";

  return `# ${options.name}

${options.description}

## Develop

\`\`\`bash
bun install
bun run build
\`\`\`

\`action.yml\` points at \`dist/index.js\`. Commit \`dist/\` if you publish the action from git.
${workflowHint}`;
}

function toWorkflowFileName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "action"
  );
}

export function githubWorkflowYml(options: ScaffoldOptions): string {
  const withBlock = options.sampleInput
    ? `\n        with:\n          name: Alice`
    : "";

  return `name: ${options.name}

on:
  push:
  pull_request:
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile

      - uses: terella-project/build-actions@v1
        with:
          path: .

      - uses: ./${withBlock}
`;
}

/** README snippet kept in sync with generated workflow source. */
export function readmeWorkflowSnippet(): string {
  return workflowSource({
    name: "my-action",
    description: "My custom action",
    author: "",
    packageName: "my-action",
    frameworkVersion: "0.0.1",
    sampleInput: true,
    githubWorkflow: false,
  }).trimEnd();
}

export function scaffoldFiles(options: ScaffoldOptions): ScaffoldFile[] {
  const files: ScaffoldFile[] = [
    { path: "package.json", content: packageJson(options) },
    { path: "action.yml", content: actionYml(options) },
    { path: "tsconfig.json", content: tsconfigJson() },
    { path: "src/workflow.ts", content: workflowSource(options) },
    { path: "src/index.ts", content: indexSource(options) },
    { path: ".gitignore", content: gitignore() },
    { path: ".env.example", content: envExample(options) },
    { path: "README.md", content: packageReadme(options) },
  ];

  if (options.githubWorkflow) {
    files.push({
      path: `.github/workflows/${toWorkflowFileName(options.name)}.yml`,
      content: githubWorkflowYml(options),
    });
  }

  return files;
}
