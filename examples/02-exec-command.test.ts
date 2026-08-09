import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../src/index";
import { ExecCommandWorkflow } from "./02-exec-command";

test("ExecCommandWorkflow runs without error", async () => {
  const mockRuntime = new MockActionRuntime();
  let capturedCommand = "";
  let capturedArgs: string[] = [];

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {
        createExecClient: () => ({
          exec: async (
            cmd: string,
            args?: string[],
            options?: { listeners?: { stdout?: (data: Buffer) => void } },
          ) => {
            capturedCommand = cmd;
            capturedArgs = args ?? [];
            options?.listeners?.stdout?.(Buffer.from("mock-output\n"));
            return 0;
          },
        }),
      },
    },
    {
      runtime: mockRuntime,
    },
  );

  await runComposedAction(composition, ExecCommandWorkflow);

  expect(capturedCommand).toBe("ls");
  expect(capturedArgs).toEqual(["-la"]);
  expect(mockRuntime.logs).toContainEqual({
    level: "info",
    message: "Running 'ls -la'...",
  });
  expect(mockRuntime.logs).toContainEqual({
    level: "info",
    message: "mock-output\n",
  });
});
