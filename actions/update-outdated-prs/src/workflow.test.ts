import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../../../src/index";
import { UpdateOutdatedPrsWorkflow } from "./workflow";

test("UpdateOutdatedPrsWorkflow updates dependabot and regular PRs", async () => {
  const mockRuntime = new MockActionRuntime();
  process.env.GITHUB_REPOSITORY = "owner/repo";

  const ghListOutput = "42\tdependabot[bot]\n17\tgeoffsee\n";

  const calls: { cmd: string; args: string[] }[] = [];

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {
        createExecClient: () => ({
          exec: async (cmd: string, args?: string[]) => {
            calls.push({ cmd, args: args ?? [] });
            return 0;
          },
          getExecOutput: async (
            cmd: string,
            args?: string[],
            _opts?: { ignoreReturnCode?: boolean },
          ) => {
            calls.push({ cmd, args: args ?? [] });
            const key = `${cmd} ${(args ?? []).join(" ")}`;
            if (key.startsWith("gh pr list")) {
              return { exitCode: 0, stdout: ghListOutput, stderr: "" };
            }
            return { exitCode: 0, stdout: "", stderr: "" };
          },
        }),
      },
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, UpdateOutdatedPrsWorkflow);

  // Dependabot PR gets a comment
  expect(
    calls.some(
      (c) =>
        c.cmd === "gh" &&
        c.args[0] === "pr" &&
        c.args[1] === "comment" &&
        c.args.includes("42") &&
        c.args.includes("@dependabot rebase"),
    ),
  ).toBe(true);

  // Regular PR gets update-branch
  expect(
    calls.some(
      (c) =>
        c.cmd === "gh" &&
        c.args[0] === "pr" &&
        c.args[1] === "update-branch" &&
        c.args.includes("17"),
    ),
  ).toBe(true);
});

test("UpdateOutdatedPrsWorkflow fails without GITHUB_REPOSITORY", async () => {
  const mockRuntime = new MockActionRuntime();
  delete process.env.GITHUB_REPOSITORY;

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {
        createExecClient: () => ({
          exec: async () => 0,
          getExecOutput: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
        }),
      },
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, UpdateOutdatedPrsWorkflow);
  expect(mockRuntime.failedMessage).toBe("GITHUB_REPOSITORY not set");
});
