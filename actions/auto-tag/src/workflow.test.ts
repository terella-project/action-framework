import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../../../src/index";
import { AutoTagWorkflow } from "./workflow";

interface ExecCall {
  cmd: string;
  args: string[];
}

function createMockExec(
  calls: ExecCall[],
  outputs: Map<string, { exitCode: number; stdout: string; stderr: string }>,
) {
  return {
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
      const out = outputs.get(key);
      if (out) return out;
      return { exitCode: 0, stdout: "", stderr: "" };
    },
  };
}

test("AutoTagWorkflow bumps patch version and tags", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["bump"] = "patch";
  const calls: ExecCall[] = [];

  const outputs = new Map<
    string,
    { exitCode: number; stdout: string; stderr: string }
  >([
    [
      "node -p require('./package.json').version",
      { exitCode: 0, stdout: "1.2.3\n", stderr: "" },
    ],
    [
      "git rev-parse -q --verify refs/tags/v1.2.4",
      { exitCode: 1, stdout: "", stderr: "" },
    ],
    ["git diff --cached --quiet", { exitCode: 1, stdout: "", stderr: "" }],
    [
      "git rev-parse -q --verify refs/tags/v1.2.4",
      { exitCode: 1, stdout: "", stderr: "" },
    ],
  ]);

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {
        createExecClient: () => createMockExec(calls, outputs),
      },
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, AutoTagWorkflow);

  // Verify version was read
  expect(calls.some((c) => c.cmd === "node" && c.args[0] === "-p")).toBe(true);
  // Verify commit and push happened
  expect(
    calls.some(
      (c) =>
        c.cmd === "git" &&
        c.args[0] === "commit" &&
        c.args.includes("chore(release): v1.2.4"),
    ),
  ).toBe(true);
  expect(
    calls.some(
      (c) =>
        c.cmd === "git" && c.args[0] === "push" && c.args.includes("HEAD:main"),
    ),
  ).toBe(true);
  // Verify tag was created and pushed
  expect(
    calls.some(
      (c) =>
        c.cmd === "git" && c.args[0] === "tag" && c.args.includes("v1.2.4"),
    ),
  ).toBe(true);
  expect(
    calls.some(
      (c) =>
        c.cmd === "git" && c.args[0] === "push" && c.args.includes("v1.2.4"),
    ),
  ).toBe(true);
  // Summary was written
  expect(mockRuntime.summaryWritten).toBe(true);
  expect(mockRuntime.summaryRaw.some((s) => s.includes("v1.2.4"))).toBe(true);
});

test("AutoTagWorkflow fails on unknown bump type", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["bump"] = "bogus";

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {
        createExecClient: () => createMockExec([], new Map()),
      },
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, AutoTagWorkflow);

  expect(mockRuntime.failedMessage).toBe("Unknown bump type: bogus");
});

test("AutoTagWorkflow fails when tag already exists", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["bump"] = "patch";
  const calls: ExecCall[] = [];

  const outputs = new Map<
    string,
    { exitCode: number; stdout: string; stderr: string }
  >([
    [
      "node -p require('./package.json').version",
      { exitCode: 0, stdout: "1.2.3\n", stderr: "" },
    ],
    [
      "git rev-parse -q --verify refs/tags/v1.2.4",
      { exitCode: 0, stdout: "", stderr: "" },
    ],
  ]);

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {
        createExecClient: () => createMockExec(calls, outputs),
      },
    },
    { runtime: mockRuntime },
  );

  await expect(
    runComposedAction(composition, AutoTagWorkflow),
  ).rejects.toThrow();
  expect(mockRuntime.failedMessage).toBe("tag v1.2.4 already exists");
});
