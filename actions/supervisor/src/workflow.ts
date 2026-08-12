import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  type ExecClient,
  Inject,
  InjectableWorkflow,
} from "../../../src/index";

/**
 * Supervisor action: installs the Cursor CLI and runs the weekly unsticker
 * agent against the repository.
 *
 * Replaces .github/workflows/supervisor.yml inline shell steps.
 */
@InjectableWorkflow()
export class SupervisorWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
    @Inject(ACTION_COMPONENTS.mainDependencies)
    private readonly deps: { createExecClient: () => ExecClient },
  ) {}

  async run(): Promise<void> {
    const exec = this.deps.createExecClient();

    this.runtime.info("Installing Cursor CLI...");
    const installResult = await exec.getExecOutput("bash", [
      "-c",
      "curl https://cursor.com/install -fsS | bash",
    ]);
    this.runtime.info(installResult.stdout);

    // The install script adds to ~/.cursor/bin; ensure it's on PATH for the
    // subsequent exec call. addPath persists for subsequent steps in the
    // same job, but within this action we also set it for our own process.
    const home = process.env.HOME ?? "";
    const cursorBin = `${home}/.cursor/bin`;
    process.env.PATH = `${cursorBin}:${process.env.PATH ?? ""}`;
    this.runtime.addPath(cursorBin);

    const prompt = [
      "You are the weekly unsticker for this repository.",
      "",
      "Goal: find anything stuck that blocks Dependabot updates from landing",
      "and shipping (open/failing Dependabot PRs, red CI on the default",
      "branch, failed Auto Tag / Publish runs, merge conflicts, missing",
      "required checks), then fix it with the smallest safe change.",
      "",
      "Rules:",
      "- Prefer fixing CI, rebasing/updating Dependabot PRs, and unblocking",
      "  auto-tag/publish over large refactors.",
      "- Do not weaken branch protection or disable required checks.",
      "- Open or update a PR if direct push is blocked; otherwise push to",
      "  the default branch only when safe and hooks/CI would pass.",
      "- Summarize what was stuck and what you did at the end.",
    ].join("\n");

    this.runtime.info("Running Cursor Agent...");
    await exec.exec("agent", [
      "-p",
      prompt,
      "--model",
      "auto",
      "--force",
      "--trust",
      "--sandbox",
      "disabled",
    ]);
  }
}
