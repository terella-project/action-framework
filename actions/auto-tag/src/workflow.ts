import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  type ExecClient,
  Inject,
  InjectableWorkflow,
} from "../../../src/index";

/**
 * Auto-tag action: computes the next version, bumps package.json on main,
 * commits, tags, and pushes the tag (which triggers the publish workflow).
 *
 * Replaces .github/workflows/auto-tag.yml inline shell steps.
 */
@InjectableWorkflow()
export class AutoTagWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
    @Inject(ACTION_COMPONENTS.mainDependencies)
    private readonly deps: { createExecClient: () => ExecClient },
  ) {}

  async run(): Promise<void> {
    const exec = this.deps.createExecClient();
    const bump = this.runtime.getInput("bump") || "patch";

    if (bump !== "patch" && bump !== "minor" && bump !== "major") {
      this.runtime.setFailed(`Unknown bump type: ${bump}`);
      return;
    }

    const current = await this.readPackageVersion(exec);
    this.runtime.info(`Current version: ${current}`);

    const next = this.computeNextVersion(current, bump);
    this.runtime.info(`Next version: ${next} (${bump})`);

    await this.checkTagDoesNotExist(exec, next);
    await this.bumpAndCommit(exec, next);
    await this.tagRelease(exec, next);

    this.runtime.summary
      .addRaw(`### Released \`v${next}\`\n`)
      .addRaw(
        `Bumped from \`${current}\`. Publish workflow triggered by tag push.\n`,
      )
      .write();
  }

  private async readPackageVersion(exec: ExecClient): Promise<string> {
    const output = await exec.getExecOutput("node", [
      "-p",
      "require('./package.json').version",
    ]);
    const version = output.stdout.trim();
    if (!version || version === "undefined") {
      this.runtime.setFailed("could not read version from package.json");
      throw new Error("could not read version from package.json");
    }
    return version;
  }

  private computeNextVersion(current: string, bump: string): string {
    const parts = current.split(".");
    let major = parseInt(parts[0] ?? "0", 10);
    let minor = parseInt(parts[1] ?? "0", 10);
    let patch = parseInt((parts[2] ?? "0").split("-")[0], 10);

    switch (bump) {
      case "major":
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case "minor":
        minor += 1;
        patch = 0;
        break;
      case "patch":
        patch += 1;
        break;
    }

    return `${major}.${minor}.${patch}`;
  }

  private async checkTagDoesNotExist(
    exec: ExecClient,
    next: string,
  ): Promise<void> {
    const result = await exec.getExecOutput(
      "git",
      ["rev-parse", "-q", "--verify", `refs/tags/v${next}`],
      { ignoreReturnCode: true },
    );
    if (result.exitCode === 0) {
      this.runtime.setFailed(`tag v${next} already exists`);
      throw new Error(`tag v${next} already exists`);
    }
  }

  private async bumpAndCommit(exec: ExecClient, next: string): Promise<void> {
    this.runtime.info(`Bumping version to ${next} on main...`);

    await exec.exec("git", ["config", "user.name", "github-actions[bot]"]);
    await exec.exec("git", [
      "config",
      "user.email",
      "github-actions[bot]@users.noreply.github.com",
    ]);
    await exec.exec("git", ["fetch", "origin", "main"]);
    await exec.exec("git", ["checkout", "-B", "main", "origin/main"]);
    await exec.exec("npm", [
      "version",
      next,
      "--no-git-tag-version",
      "--allow-same-version",
    ]);

    await exec.exec("git", ["add", "package.json"]);
    await exec.exec(
      "git",
      [
        "add",
        "-u",
        "bun.lock",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
      ],
      { ignoreReturnCode: true },
    );

    const diffResult = await exec.getExecOutput(
      "git",
      ["diff", "--cached", "--quiet"],
      { ignoreReturnCode: true },
    );
    if (diffResult.exitCode === 0) {
      this.runtime.setFailed(
        `nothing to commit for v${next} (package.json already at that version?)`,
      );
      throw new Error(`nothing to commit for v${next}`);
    }

    await exec.exec("git", ["commit", "-m", `chore(release): v${next}`]);
    await exec.exec("git", ["push", "origin", "HEAD:main"]);
  }

  private async tagRelease(exec: ExecClient, next: string): Promise<void> {
    this.runtime.info(`Tagging v${next}...`);

    await exec.exec("git", ["fetch", "origin", "main"]);
    await exec.exec("git", ["checkout", "main"]);
    await exec.exec("git", ["reset", "--hard", "origin/main"]);

    const result = await exec.getExecOutput(
      "git",
      ["rev-parse", "-q", "--verify", `refs/tags/v${next}`],
      { ignoreReturnCode: true },
    );

    if (result.exitCode !== 0) {
      await exec.exec("git", [
        "tag",
        "-a",
        `v${next}`,
        "-m",
        `Release v${next}`,
      ]);
      await exec.exec("git", ["push", "origin", `v${next}`]);
      this.runtime.info(`Tagged v${next}`);
    } else {
      this.runtime.info(`Tag v${next} already exists`);
    }
  }
}
