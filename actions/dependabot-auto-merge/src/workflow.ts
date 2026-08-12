import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  type ExecClient,
  Inject,
  InjectableWorkflow,
} from "../../../src/index";

/**
 * Dependabot auto-merge action.
 *
 * Reads Dependabot metadata inputs (populated by the dependabot/fetch-metadata
 * action in the workflow) and enables auto-merge for non-major updates.
 *
 * Replaces .github/workflows/dependabot-auto-merge.yml inline shell steps.
 */
@InjectableWorkflow()
export class DependabotAutoMergeWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
    @Inject(ACTION_COMPONENTS.mainDependencies)
    private readonly deps: { createExecClient: () => ExecClient },
  ) {}

  async run(): Promise<void> {
    const dependencyGroup = this.runtime.getInput("dependency-group");
    const updateType = this.runtime.getInput("update-type");
    const prUrl = this.runtime.getInput("pr-url");

    if (!prUrl) {
      this.runtime.info("No PR URL provided, skipping.");
      return;
    }

    const isMajor =
      updateType === "version-update:semver-major" ||
      dependencyGroup === "bun-major";

    if (isMajor) {
      this.runtime.info("Major update — auto-merge not enabled.");
      return;
    }

    this.runtime.info(`Enabling auto-merge for ${prUrl}...`);
    const exec = this.deps.createExecClient();
    await exec.exec("gh", ["pr", "merge", "--auto", "--squash", prUrl]);
    this.runtime.info("Auto-merge enabled.");
  }
}
