import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  createActionComposition,
  type ExecClient,
  Inject,
  InjectableWorkflow,
  runComposedAction,
} from "../src/index";

/**
 * A workflow that runs a shell command and logs the output.
 */
@InjectableWorkflow()
export class ExecCommandWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
    // We can also inject mainDependencies to get access to factory methods
    @Inject(ACTION_COMPONENTS.mainDependencies)
    private readonly deps: { createExecClient: () => ExecClient },
  ) {}

  async run(): Promise<void> {
    const exec = this.deps.createExecClient();
    this.runtime.info("Running 'ls -la'...");

    await exec.exec("ls", ["-la"], {
      listeners: {
        stdout: (data: Buffer) => {
          this.runtime.info(data.toString());
        },
      },
    });
  }
}

// Composition setup
const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {
    createExecClient: () => ({
      exec: async (cmd: string, args?: string[]) => {
        console.log(`[MOCK EXEC] ${cmd} ${args?.join(" ")}`);
        return 0;
      },
    }),
  },
});

// Run the action (when run directly)
if (import.meta.url.endsWith(process.argv[1])) {
  runComposedAction(composition, ExecCommandWorkflow).catch(console.error);
}
