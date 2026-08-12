import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../../../src/index";
import { SupervisorWorkflow } from "./workflow";

test("SupervisorWorkflow installs cursor and runs agent", async () => {
  const mockRuntime = new MockActionRuntime();
  process.env.HOME = "/tmp/test-home";

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
          getExecOutput: async (cmd: string, args?: string[]) => {
            calls.push({ cmd, args: args ?? [] });
            return { exitCode: 0, stdout: "cursor installed", stderr: "" };
          },
        }),
      },
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, SupervisorWorkflow);

  // Cursor install script was run
  expect(calls.some((c) => c.cmd === "bash" && c.args[0] === "-c")).toBe(true);

  // Agent was invoked with the prompt
  const agentCall = calls.find((c) => c.cmd === "agent");
  expect(agentCall).toBeDefined();
  const agentArgs = agentCall?.args ?? [];
  expect(agentArgs).toContain("--model");
  expect(agentArgs).toContain("auto");
  expect(agentArgs).toContain("--force");
  expect(agentArgs).toContain("--trust");

  // PATH was updated
  expect(mockRuntime.paths).toContain("/tmp/test-home/.cursor/bin");
});
