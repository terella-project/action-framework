import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../../../src/index";
import { DependabotAutoMergeWorkflow } from "./workflow";

test("DependabotAutoMergeWorkflow enables auto-merge for minor updates", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["dependency-group"] = "bun-minor-and-patch";
  mockRuntime.inputs["update-type"] = "version-update:semver-minor";
  mockRuntime.inputs["pr-url"] = "https://github.com/owner/repo/pull/5";

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
          getExecOutput: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
        }),
      },
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, DependabotAutoMergeWorkflow);

  expect(calls).toContainEqual({
    cmd: "gh",
    args: [
      "pr",
      "merge",
      "--auto",
      "--squash",
      "https://github.com/owner/repo/pull/5",
    ],
  });
});

test("DependabotAutoMergeWorkflow skips major updates", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["dependency-group"] = "bun-major";
  mockRuntime.inputs["update-type"] = "version-update:semver-major";
  mockRuntime.inputs["pr-url"] = "https://github.com/owner/repo/pull/6";

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
          getExecOutput: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
        }),
      },
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, DependabotAutoMergeWorkflow);

  expect(calls).toEqual([]);
  expect(mockRuntime.logs).toContainEqual({
    level: "info",
    message: "Major update — auto-merge not enabled.",
  });
});

test("DependabotAutoMergeWorkflow skips when no PR URL", async () => {
  const mockRuntime = new MockActionRuntime();

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

  await runComposedAction(composition, DependabotAutoMergeWorkflow);
  expect(mockRuntime.logs).toContainEqual({
    level: "info",
    message: "No PR URL provided, skipping.",
  });
});
