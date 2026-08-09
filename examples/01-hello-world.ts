import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  createActionComposition,
  Inject,
  InjectableWorkflow,
  runComposedAction,
} from "../src/index";

/**
 * A simple workflow that reads an input and prints a message.
 */
@InjectableWorkflow()
export class HelloWorldWorkflow {
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

// Composition setup
const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

// Run the action (when run directly)
if (import.meta.url.endsWith(process.argv[1])) {
  runComposedAction(composition, HelloWorldWorkflow).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
