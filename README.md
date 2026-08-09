# @terella/action-framework

A lightweight, testable framework for building GitHub Actions using Dependency Injection.

```typescript
import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  createActionComposition,
  Inject,
  InjectableService,
  InjectableWorkflow,
  runComposedAction,
} from "@terella/action-framework";

// 1. Define services with Dependency Injection
@InjectableService()
class GreetService {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime
  ) {}

  greet(name: string) {
    this.runtime.info(`Hello, ${name}!`);
  }
}

// 2. Define your Action workflow
@InjectableWorkflow()
class MyWorkflow {
  constructor(
    private readonly greeter: GreetService,
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime
  ) {}

  async run() {
    const name = this.runtime.getInput("name") || "World";
    this.greeter.greet(name);
    this.runtime.setOutput("status", "completed");
  }
}

// 3. Compose and run
const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

runComposedAction(composition, MyWorkflow);
```

## Integration and Usage

After writing your action logic, you need to integrate it with GitHub Actions.

### 1. Build the Action

GitHub Actions run on Node.js, so you must compile your TypeScript code to JavaScript. It is recommended to bundle all dependencies into a single file (e.g., using `esbuild`, `ncc`, or `bun build`).

```bash
# Example using bun to bundle
bun build ./src/index.ts --outfile ./dist/index.js --target node --minify
```

### 2. Define `action.yml`

Create an `action.yml` file in your repository root to describe your action's inputs and point to the compiled entry point.

```yaml
name: "My Custom Action"
description: "A description of what my action does"
inputs:
  name:
    description: "Who to greet"
    required: false
    default: "World"
outputs:
  status:
    description: "The status of the greeting"
runs:
  using: "node20"
  main: "dist/index.js"
```

### 3. Use in a Workflow

You can now use your action in any GitHub Workflow:

```yaml
name: Greet User
on: [push]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./ # Points to the action in the current repo
        with:
          name: "Alice"
```

## Testing
A key feature of the framework is that it's built for testability.

### Unit Testing with `MockActionRuntime`
You can test your action logic without any GitHub Action environment by using the `MockActionRuntime`.

```typescript
import { MockActionRuntime, createActionComposition, runComposedAction } from "@terella/action-framework";
import { MyWorkflow } from "./my-workflow";

test("my workflow logic", async () => {
  const runtime = new MockActionRuntime();
  runtime.inputs["name"] = "Tester";

  const composition = createActionComposition({
    githubContext: { repo: { owner: "owner", repo: "repo" } },
    dependencies: {},
  }, { runtime });

  await runComposedAction(composition, MyWorkflow);

  expect(runtime.outputs["status"]).toBe("completed");
});
```

### Local Testing with `@github/local-action`
The framework is fully compatible with [@github/local-action](https://github.com/github/local-action), which allows you to run your action locally while simulating the GitHub environment (inputs, secrets, etc.).

1. **Install the tool**:
   ```bash
   npm install --save-dev @github/local-action
   ```

2. **Run your action**:
   ```bash
   npx local-action run . src/main.ts .env
   ```
   *Note: Ensure you have an `action.yml` in the current directory and a `.env` file for your inputs.*

## Features

- **Decoupled Runtime**: Abstracted `ActionRuntime` to make logic testable without actual `@actions/core` environment.
- **Dependency Injection**: Powered by `@di-framework/core` for clean service composition.
- **Test First**: Built-in support for mocking dependencies and runtime.
- **Minimalistic**: Low overhead, only what you need for typical GitHub Action tasks.

## Examples

See the `examples/` directory for more detailed usage:

1.  **[01-hello-world.ts](./examples/01-hello-world.ts)**: Basic usage of `ActionRuntime` and composition.
2.  **[02-exec-command.ts](./examples/02-exec-command.ts)**: Executing shell commands using `ExecClient`.
3.  **[03-github-integration.ts](./examples/03-github-integration.ts)**: Integrating with GitHub client using `GitHubActionPortFactory`.
4.  **[04-custom-services.ts](./examples/04-custom-services.ts)**: Defining and injecting custom services.
5.  **[05-local-action-testing.ts](./examples/05-local-action-testing.ts)**: Demonstrating testing strategies, including `MockActionRuntime`.

## Core Components

- `ActionRuntime`: Interface for GitHub Action inputs, outputs, and logging.
- `ActionComposition`: The DI container for the action.
- `ExecClient`: Simple wrapper for executing commands.
- `GitHubActionPortFactory`: Factory for creating GitHub and Exec clients with injected context.
