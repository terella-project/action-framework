import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../src/index";
import { GreetWorkflow } from "./05-local-action-testing";

test("GreetWorkflow should greet the user", async () => {
  const mockRuntime = new MockActionRuntime();
  mockRuntime.inputs["name"] = "UnitTester";

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {},
    },
    {
      runtime: mockRuntime,
    },
  );

  await runComposedAction(composition, GreetWorkflow);

  expect(mockRuntime.outputs["message"]).toBe("Greeting sent to UnitTester");
  expect(mockRuntime.logs).toContainEqual({
    level: "info",
    message: "Hello, UnitTester!",
  });
});
