import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../src/index";
import { GitHubWorkflow } from "./03-github-integration";

test("GitHubWorkflow runs without error", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["github-token"] = "fake-token";

  let capturedToken = "";
  let capturedOwner = "";
  let capturedRepo = "";

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "terella-labs", repo: "terella" } },
      dependencies: {
        createGitHubClient: (token: string, owner: string, repo: string) => {
          capturedToken = token;
          capturedOwner = owner;
          capturedRepo = repo;

          return {
            listIssues: async () => {
              return [{ number: 1, title: "Example issue" }];
            },
          };
        },
        createExecClient: () => ({
          exec: async () => 0,
        }),
      },
    },
    {
      runtime: mockRuntime,
    },
  );

  await runComposedAction(composition, GitHubWorkflow);

  expect(capturedToken).toBe("fake-token");
  expect(capturedOwner).toBe("terella-labs");
  expect(capturedRepo).toBe("terella");
  expect(mockRuntime.logs).toContainEqual({
    level: "info",
    message: "Fetching issues...",
  });
  expect(mockRuntime.logs).toContainEqual({
    level: "info",
    message: "Found 1 issues.",
  });
});
