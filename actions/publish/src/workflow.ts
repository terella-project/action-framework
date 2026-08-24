import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  type ExecClient,
  Inject,
  InjectableWorkflow,
} from "../../../src/index";

/**
 * Publish action: verifies tag matches package.json version, runs tests,
 * and publishes to npm via trusted publishing (OIDC) or NPM_TOKEN fallback.
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
    this.runtime.info("Building package so npm sees dist before pack...");
    await exec.exec("bun", ["run", "build"]);

    const npmVersion = await exec.getExecOutput("npm", ["--version"]);
    this.runtime.info(`npm ${npmVersion.stdout.trim()}`);

    const token = (
      process.env.NODE_AUTH_TOKEN ||
      process.env.NPM_TOKEN ||
      ""
    ).trim();

    if (token) {
      await this.publishWithToken(exec, token);
      return;
    }

    await this.publishWithOidc(exec);
  }

  private async publishWithToken(
    exec: ExecClient,
    token: string,
  ): Promise<void> {
    this.runtime.info("Publishing with NPM_TOKEN (classic auth)...");
    const npmrc = join(process.cwd(), ".npmrc");
    await writeFile(
      npmrc,
      [
        "registry=https://registry.npmjs.org/",
        `//registry.npmjs.org/:_authToken=${token}`,
        "",
      ].join("\n"),
      { mode: 0o600 },
    );

    try {
      await exec.exec("npm", ["publish", "--access", "public"]);
      this.runtime.info("Published.");
    } catch (error) {
      this.runtime.setFailed(
        "npm publish with NPM_TOKEN failed. Check that the token can publish @terella/action-framework.",
      );
      throw error;
    }
  }

  private async publishWithOidc(exec: ExecClient): Promise<void> {
    // setup-node registry-url points NPM_CONFIG_USERCONFIG at an .npmrc with
    // _authToken, which keeps npm on classic auth and skips OIDC.
    // Empty NODE_AUTH_TOKEN / NPM_TOKEN must not be present either.
    delete process.env.NODE_AUTH_TOKEN;
    delete process.env.NPM_TOKEN;
    delete process.env.NPM_CONFIG_USERCONFIG;

    const oidcReady = Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
    this.runtime.info(`OIDC endpoint present: ${oidcReady}`);

    if (!oidcReady) {
      const message =
        "No NPM_TOKEN and no GitHub OIDC endpoint. Grant id-token: write, or set secrets.NPM_TOKEN.";
      this.runtime.setFailed(message);
      throw new Error(message);
    }

    this.runtime.info("Publishing via npm trusted publishing (OIDC)...");
    try {
      await exec.exec("npm", ["publish", "--access", "public", "--provenance"]);
      this.runtime.info("Published.");
    } catch (error) {
      this.runtime.setFailed(
        [
          "npm OIDC publish failed (ENEEDAUTH usually means Trusted Publisher is not configured).",
          "On npmjs.com → @terella/action-framework → Settings → Trusted Publisher,",
          "add GitHub Actions: terella-project/action-framework, workflow publish.yml.",
          "Or set repository secret NPM_TOKEN for classic auth fallback.",
        ].join(" "),
      );
      throw error;
    }
  }
}
