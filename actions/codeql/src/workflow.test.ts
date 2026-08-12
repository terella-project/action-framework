import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../../../src/index";
import { CodeqlWorkflow } from "./workflow";

test("CodeqlWorkflow sets outputs for javascript-typescript with defaults", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["language"] = "javascript-typescript";

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {},
    },
    { runtime: mockRuntime },
  );

  await runComposedAction(composition, CodeqlWorkflow);

  expect(mockRuntime.outputs["language"]).toBe("javascript-typescript");
  expect(mockRuntime.outputs["build-mode"]).toBe("none");
  expect(mockRuntime.outputs["queries"]).toBe("security-and-quality");
  expect(mockRuntime.outputs["category"]).toBe(
    "/language:javascript-typescript",
  );
});

test("CodeqlWorkflow sets outputs for actions language", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["language"] = "actions";

  const composition = createContext(mockRuntime);

  await runComposedAction(composition, CodeqlWorkflow);

  expect(mockRuntime.outputs["language"]).toBe("actions");
  expect(mockRuntime.outputs["build-mode"]).toBe("none");
});

test("CodeqlWorkflow defaults python build-mode to none", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["language"] = "python";

  const composition = createContext(mockRuntime);

  await runComposedAction(composition, CodeqlWorkflow);

  expect(mockRuntime.outputs["build-mode"]).toBe("none");
});

test("CodeqlWorkflow defaults go build-mode to autobuild", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["language"] = "go";

  const composition = createContext(mockRuntime);

  await runComposedAction(composition, CodeqlWorkflow);

  expect(mockRuntime.outputs["build-mode"]).toBe("autobuild");
});

test("CodeqlWorkflow respects explicit build-mode", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["language"] = "go";
  mockRuntime.inputs["build-mode"] = "manual";

  const composition = createContext(mockRuntime);

  await runComposedAction(composition, CodeqlWorkflow);

  expect(mockRuntime.outputs["build-mode"]).toBe("manual");
});

test("CodeqlWorkflow respects custom category", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["language"] = "javascript-typescript";
  mockRuntime.inputs["category"] = "custom-category";

  const composition = createContext(mockRuntime);

  await runComposedAction(composition, CodeqlWorkflow);

  expect(mockRuntime.outputs["category"]).toBe("custom-category");
});

test("CodeqlWorkflow fails on unsupported language", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["language"] = "brainfuck";

  const composition = createContext(mockRuntime);

  await runComposedAction(composition, CodeqlWorkflow);

  expect(mockRuntime.failedMessage).toBe(
    "Unsupported CodeQL language: brainfuck",
  );
});

test("CodeqlWorkflow warns when build-mode none used with compiled language", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["language"] = "go";
  mockRuntime.inputs["build-mode"] = "none";

  const composition = createContext(mockRuntime);

  await runComposedAction(composition, CodeqlWorkflow);

  expect(mockRuntime.logs).toContainEqual({
    level: "warning",
    message:
      "Language 'go' typically requires a build; build-mode 'none' may miss results.",
  });
});

function createContext(mockRuntime: MockActionRuntime) {
  return createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {},
    },
    { runtime: mockRuntime },
  );
}
