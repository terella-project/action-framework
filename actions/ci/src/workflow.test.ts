import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../../../src/index";
import { CiWorkflow } from "./workflow";

test("CiWorkflow runs install, typecheck, and test", async () => {
  const mockRuntime = new MockActionRuntime();
  const commands: { cmd: string; args: string[] }[] = [];

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {
        createExecClient: () => ({
          exec: async (cmd: string, args?: string[]) => {
            commands.push({ cmd, args: args ?? [] });
            return 0;
          },
          getExecOutput: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
        }),
      },
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, CiWorkflow);

  expect(commands).toEqual([
    { cmd: "bun", args: ["install", "--frozen-lockfile"] },
    { cmd: "bun", args: ["run", "typecheck"] },
    { cmd: "bun", args: ["run", "test"] },
  ]);
});
