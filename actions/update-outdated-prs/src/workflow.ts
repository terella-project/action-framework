import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  type ExecClient,
  Inject,
  InjectableWorkflow,
} from "../../../src/index";
import type { PullRequest } from "../../types";

/**
 * Update outdated PR branches action.
 *
 * Lists open non-draft PRs that are BEHIND main, then either asks Dependabot
 * to rebase (for dependabot PRs) or uses `gh pr update-branch` for others.
 *
 * Replaces .github/workflows/update-outdated-prs.yml inline shell steps.
 */
@InjectableWorkflow()
export class UpdateOutdatedPrsWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
    @Inject(ACTION_COMPONENTS.mainDependencies)
    private readonly deps: { createExecClient: () => ExecClient },
  ) {}

  async run(): Promise<void> {
    const exec = this.deps.createExecClient();
    const repo = process.env.GITHUB_REPOSITORY ?? "";
    if (!repo) {
      this.runtime.setFailed("GITHUB_REPOSITORY not set");
      return;
    }

    const prs = await this.listBehindPrs(exec, repo);
    this.runtime.info(`Found ${prs.length} PRs to update.`);

    for (const pr of prs) {
      this.runtime.info(`Updating PR #${pr.number} (${pr.author})...`);
      if (pr.author === "dependabot[bot]" || pr.author === "app/dependabot") {
        await exec.exec("gh", [
          "pr",
          "comment",
          String(pr.number),
          "--repo",
          repo,
          "--body",
          "@dependabot rebase",
        ]);
      } else {
        const result = await exec.getExecOutput(
          "gh",
          ["pr", "update-branch", String(pr.number), "--repo", repo],
          { ignoreReturnCode: true },
        );
        if (result.exitCode !== 0) {
          this.runtime.info(
            `Skipped PR #${pr.number} (update failed — likely conflicts)`,
          );
        }
      }
    }
  }

  private async listBehindPrs(
    exec: ExecClient,
    repo: string,
  ): Promise<PullRequest[]> {
    const output = await exec.getExecOutput("gh", [
      "pr",
      "list",
      "--repo",
      repo,
      "--base",
      "main",
      "--state",
      "open",
      "--json",
      "number,author,isDraft,mergeStateStatus",
      "--jq",
      '.[] | select(.isDraft|not) | select(.mergeStateStatus == "BEHIND") | "\\(.number)\\t\\(.author.login)"',
    ]);

    const prs: PullRequest[] = [];
    for (const line of output.stdout.trim().split("\n")) {
      if (!line) continue;
      const [numStr, author] = line.split("\t");
      const number = parseInt(numStr ?? "", 10);
      if (Number.isNaN(number)) continue;
      prs.push({
        number,
        author: author ?? "",
        isDraft: false,
        mergeStateStatus: "BEHIND",
      });
    }
    return prs;
  }
}
