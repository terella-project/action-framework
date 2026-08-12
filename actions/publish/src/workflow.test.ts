import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../../../src/index";
import { PublishWorkflow } from "./workflow";

function createContext(
  outputEntries: [
    string,
    { exitCode: number; stdout: string; stderr: string },
  ][],
  calls: { cmd: string; args: string[] }[],
  mockRuntime: MockActionRuntime,
) {
  const outputs = new Map(outputEntries);
  return createActionComposition(
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
            const key = `${cmd} ${(args ?? []).join(" ")}`;
            return outputs.get(key) ?? { exitCode: 0, stdout: "", stderr: "" };
          },
        }),
      },
    },
    { runtime: mockRuntime },
  );
}

test("PublishWorkflow verifies, tests, and publishes", async () => {
  const mockRuntime = new MockActionRuntime();
  process.env.GITHUB_REF_NAME = "v2.0.1";

  const calls: { cmd: string; args: string[] }[] = [];

  const composition = createContext(
    [
      [
        "node -p require('./package.json').version",
        { exitCode: 0, stdout: "2.0.1\n", stderr: "" },
      ],
    ],
    calls,
    mockRuntime,
  );

  await runComposedAction(composition, PublishWorkflow);

  expect(calls.some((c) => c.cmd === "bun" && c.args.includes("install"))).toBe(
    true,
  );
  expect(calls.some((c) => c.cmd === "bun" && c.args.includes("test"))).toBe(
    true,
  );
  expect(calls.some((c) => c.cmd === "npm" && c.args.includes("publish"))).toBe(
    true,
  );
});

test("PublishWorkflow fails on version mismatch", async () => {
  const mockRuntime = new MockActionRuntime();
  process.env.GITHUB_REF_NAME = "v2.0.0";

  const calls: { cmd: string; args: string[] }[] = [];

  const composition = createContext(
    [
      [
        "node -p require('./package.json').version",
        { exitCode: 0, stdout: "2.0.1\n", stderr: "" },
      ],
    ],
    calls,
    mockRuntime,
  );

  await expect(
    runComposedAction(composition, PublishWorkflow),
  ).rejects.toThrow();
  expect(mockRuntime.failedMessage).toContain("does not match");
});
