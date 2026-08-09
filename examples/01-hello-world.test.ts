import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../src/index";
import { HelloWorldWorkflow } from "./01-hello-world";

test("HelloWorldWorkflow runs without error", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["name"] = "Framework";

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {},
    },
    {
      runtime: mockRuntime,
    },
  );

  await runComposedAction(composition, HelloWorldWorkflow);

  expect(mockRuntime.outputs["message"]).toBe("Hello, Framework!");
  expect(mockRuntime.logs).toContainEqual({
    level: "info",
    message: "Hello, Framework!",
  });
});
