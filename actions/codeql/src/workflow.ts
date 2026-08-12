import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  Inject,
  InjectableWorkflow,
} from "../../../src/index";

const SUPPORTED_LANGUAGES = new Set([
  "actions",
  "javascript-typescript",
  "python",
  "go",
  "java",
  "c-cpp",
  "csharp",
  "ruby",
  "swift",
  "kotlin",
]);

const NO_BUILD_LANGUAGES = new Set([
  "actions",
  "javascript-typescript",
  "python",
]);

/**
 * CodeQL configuration action.
 *
 * Validates and normalises CodeQL inputs for a single matrix entry, then
 * sets outputs that the workflow's `github/codeql-action/init` and
 * `github/codeql-action/analyze` steps consume.
 *
 * Replaces the static matrix configuration in .github/workflows/codeql.yml
 * with testable, validated logic.
 */
@InjectableWorkflow()
export class CodeqlWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
  ) {}

  async run(): Promise<void> {
    const language = this.runtime.getInput("language", { required: true });
    const buildMode =
      this.runtime.getInput("build-mode") || this.defaultBuildMode(language);
    const queries = this.runtime.getInput("queries") || "security-and-quality";
    const categoryInput = this.runtime.getInput("category");

    if (!SUPPORTED_LANGUAGES.has(language)) {
      this.runtime.setFailed(`Unsupported CodeQL language: ${language}`);
      return;
    }

    if (buildMode === "none" && !NO_BUILD_LANGUAGES.has(language)) {
      this.runtime.warning(
        `Language '${language}' typically requires a build; build-mode 'none' may miss results.`,
      );
    }

    const category = categoryInput || `/language:${language}`;

    this.runtime.setOutput("language", language);
    this.runtime.setOutput("build-mode", buildMode);
    this.runtime.setOutput("queries", queries);
    this.runtime.setOutput("category", category);

    this.runtime.info(
      `CodeQL config: language=${language} build-mode=${buildMode} queries=${queries} category=${category}`,
    );
  }

  private defaultBuildMode(language: string): string {
    return NO_BUILD_LANGUAGES.has(language) ? "none" : "autobuild";
  }
}
