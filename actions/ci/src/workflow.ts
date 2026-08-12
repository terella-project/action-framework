import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  type ExecClient,
  Inject,
  InjectableWorkflow,
} from "../../../src/index";

/**
 * CI action: installs dependencies, runs typecheck and tests.
 *
 * Replaces .github/workflows/ci.yml inline shell steps.
 */
@InjectableWorkflow()
export class CiWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
    @Inject(ACTION_COMPONENTS.mainDependencies)
    private readonly deps: { createExecClient: () => ExecClient },
  ) {}

  async run(): Promise<void> {
    const exec = this.deps.createExecClient();

    this.runtime.info("Installing dependencies...");
    await exec.exec("bun", ["install", "--frozen-lockfile"]);

    this.runtime.info("Running typecheck...");
    await exec.exec("bun", ["run", "typecheck"]);

    this.runtime.info("Running tests...");
    await exec.exec("bun", ["run", "test"]);
  }
}
