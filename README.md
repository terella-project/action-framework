# @terella/action-framework

DI-friendly GitHub Actions you can unit-test. Scaffold with `terella-action`, ship with `npm run build`.

## Get started

```bash
bunx @terella/action-framework init my-action --yes --workflow
cd my-action && bun install
bun run build
```

That’s a runnable Node 20 action. `action.yml` points at `dist/index.js`; `--workflow` also writes `.github/workflows/<name>.yml` that `uses: ./`.

## The whole action

`init` writes a workflow like this:

```typescript
import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  Inject,
  InjectableWorkflow,
} from "@terella/action-framework";

@InjectableWorkflow()
export class MyActionWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
  ) {}

  async run(): Promise<void> {
    const name = this.runtime.getInput("name") || "World";
    this.runtime.info(`Hello, ${name}!`);
    this.runtime.setOutput("message", `Hello, ${name}!`);
  }
}
```

Wire composition in `src/index.ts`, change inputs in `action.yml`, rebuild.

## Ship many

Same layout every time — good for fleets and reviewable diffs:

```bash
for name in sync-metadata notify-slack prune-branches; do
  bunx @terella/action-framework init "actions/$name" --yes --name "$name" \
    --description "Automation: $name"
done
```

Every package gets `bun run build` → `terella-action build` (requires [Bun](https://bun.sh)).

Flags: `--name`, `--description`, `--author`, `--yes`, `--force`, `--no-sample-input`, `--workflow`.

## Wire it up

```yaml
# action.yml (generated)
runs:
  using: "node20"
  main: "dist/index.js"
```

With `--workflow`, init also writes:

```yaml
# .github/workflows/my-action.yml
name: my-action
on:
  push:
  pull_request:
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          name: Alice
```

## Test without GitHub

```typescript
import {
  MockActionRuntime,
  createActionComposition,
  runComposedAction,
} from "@terella/action-framework";
import { MyActionWorkflow } from "./workflow.js";

const runtime = new MockActionRuntime();
runtime.inputs.name = "Tester";

await runComposedAction(
  createActionComposition(
    { githubContext: { repo: { owner: "o", repo: "r" } }, dependencies: {} },
    { runtime },
  ),
  MyActionWorkflow,
);

expect(runtime.outputs.message).toBe("Hello, Tester!");
```

## CLI

```bash
terella-action init [dir] [options]   # add --workflow for .github/workflows
terella-action build [entry=src/index.ts] [outdir=dist] [--minify]
terella-action --help
```

`build` bundles the entrypoint for Actions and writes `dist/package.json` with `"type": "module"`.

## Examples

See [`examples/`](./examples/) for exec, GitHub client, custom services, and local-action patterns.

## Features

- **ActionRuntime** — inputs, outputs, logs (swap for `MockActionRuntime` in tests)
- **DI composition** — `@InjectableWorkflow` / `@InjectableService` via `@di-framework/core`
- **terella-action** — init + build for one action or many
