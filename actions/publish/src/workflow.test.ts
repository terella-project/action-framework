import { afterEach, expect, test } from "bun:test";
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

afterEach(() => {
  delete process.env.GITHUB_REF_NAME;
  delete process.env.NODE_AUTH_TOKEN;
  delete process.env.NPM_TOKEN;
  delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
});

test("PublishWorkflow verifies, tests, and publishes via OIDC", async () => {
  const mockRuntime = new MockActionRuntime();
  process.env.GITHUB_REF_NAME = "v2.0.1";
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL = "https://example.test/oidc";

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
  expect(
    calls.some(
      (c) => c.cmd === "bun" && c.args[0] === "run" && c.args.includes("build"),
    ),
  ).toBe(true);
  expect(
    calls.some(
      (c) =>
        c.cmd === "npm" &&
        c.args.includes("publish") &&
        c.args.includes("--provenance"),
    ),
  ).toBe(true);
});

test("PublishWorkflow uses NPM_TOKEN when set", async () => {
  const mockRuntime = new MockActionRuntime();
  process.env.GITHUB_REF_NAME = "v2.0.1";
  process.env.NODE_AUTH_TOKEN = "npm_test_token";

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

  expect(
    calls.some(
      (c) =>
        c.cmd === "npm" &&
        c.args.includes("publish") &&
        !c.args.includes("--provenance"),
    ),
  ).toBe(true);
  expect(
    mockRuntime.logs.some((l) =>
      l.message.includes("Publishing with NPM_TOKEN"),
    ),
  ).toBe(true);
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
