import {
  ACTION_COMPONENTS,
  Inject,
  InjectableWorkflow,
  type MockActionRuntime,
} from "../src/index";

/**
 * 1. Define a simple workflow to test.
 */
@InjectableWorkflow()
export class GreetWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: MockActionRuntime,
  ) {}

  async run() {
    const name = this.runtime.getInput("name") || "Guest";
    this.runtime.info(`Hello, ${name}!`);
    this.runtime.setOutput("message", `Greeting sent to ${name}`);
  }
}

/**
 * 2. Integration with @github/local-action.
 *
 * To use `@github/local-action` CLI, you typically create an entrypoint file
 * and a `.env` file for inputs.
 *
 * Example .env:
 * INPUT_NAME=LocalTester
 * GITHUB_REPOSITORY=owner/repo
 *
 * Command:
 * npx @github/local-action run ./ examples/05-local-action-testing.ts .env
 */
