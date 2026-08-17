import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  type ExecClient,
  Inject,
  InjectableWorkflow,
} from "../../../src/index";

/**
 * Publish action: verifies tag matches package.json version, runs tests,
 * and publishes to npm via trusted publishing (OIDC).
 *
 * Replaces .github/workflows/publish.yml inline shell steps.
 */
@InjectableWorkflow()
export class PublishWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
    @Inject(ACTION_COMPONENTS.mainDependencies)
    private readonly deps: { createExecClient: () => ExecClient },
  ) {}

  async run(): Promise<void> {
    const exec = this.deps.createExecClient();

    await this.verifyTagMatchesVersion(exec);
    await this.installDependencies(exec);
    await this.runTests(exec);
    await this.publish(exec);
  }

  private async verifyTagMatchesVersion(exec: ExecClient): Promise<void> {
    const tagName = process.env.GITHUB_REF_NAME ?? "";
    const tag = tagName.startsWith("v") ? tagName.slice(1) : tagName;

    const output = await exec.getExecOutput("node", [
      "-p",
      "require('./package.json').version",
    ]);
    const pkgVersion = output.stdout.trim();

    this.runtime.info(`tag=${tag} pkg=${pkgVersion}`);

    if (tag !== pkgVersion) {
      this.runtime.setFailed(
        `Tag (${tag}) does not match package.json version (${pkgVersion})`,
      );
      throw new Error(`Version mismatch: tag=${tag} pkg=${pkgVersion}`);
    }
  }

  private async installDependencies(exec: ExecClient): Promise<void> {
    this.runtime.info("Installing dependencies...");
    await exec.exec("bun", ["install", "--frozen-lockfile"]);
  }

  private async runTests(exec: ExecClient): Promise<void> {
    this.runtime.info("Running tests...");
    await exec.exec("bun", ["run", "test"]);
  }

  private async publish(exec: ExecClient): Promise<void> {
    // setup-node registry-url points NPM_CONFIG_USERCONFIG at an .npmrc with
    // _authToken, which keeps npm on classic auth and skips OIDC.
    delete process.env.NODE_AUTH_TOKEN;
    delete process.env.NPM_TOKEN;
    delete process.env.NPM_CONFIG_USERCONFIG;

    this.runtime.info("Building package so npm sees dist before pack...");
    await exec.exec("bun", ["run", "build"]);

    const npmVersion = await exec.getExecOutput("npm", ["--version"]);
    this.runtime.info(`npm ${npmVersion.stdout.trim()}`);
    this.runtime.info(
      `OIDC endpoint present: ${Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL)}`,
    );

    this.runtime.info("Publishing via npm trusted publishing (OIDC)...");
    await exec.exec("npm", ["publish", "--access", "public"]);
    this.runtime.info("Published.");
  }
}
