import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  createActionComposition,
  GitHubActionPortFactory,
  Inject,
  InjectableWorkflow,
  runComposedAction,
} from "../src/index";

/**
 * A workflow that interacts with GitHub.
 */
@InjectableWorkflow()
export class GitHubWorkflow {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
    @Inject(GitHubActionPortFactory)
    private readonly portFactory: GitHubActionPortFactory,
  ) {}

  async run(): Promise<void> {
    const token = this.runtime.getInput("github-token", { required: true });
    const { gh } = this.portFactory.create(token);

    this.runtime.info("Fetching issues...");
    const issues = await (gh as any).listIssues(); // Assuming listIssues exists on the client
    this.runtime.info(`Found ${issues.length} issues.`);
  }
}

// Composition setup
const composition = createActionComposition({
  githubContext: { repo: { owner: "terella-labs", repo: "terella" } },
  dependencies: {
    createGitHubClient: (token: string, owner: string, repo: string) => ({
      listIssues: async () => {
        return [{ number: 1, title: "Example issue" }];
      },
    }),
    createExecClient: () => ({
      exec: async () => 0,
    }),
  },
});

// Run the action (when run directly)
if (import.meta.url.endsWith(process.argv[1])) {
  runComposedAction(composition, GitHubWorkflow).catch(console.error);
}
