import { expect, test } from "bun:test";
import {
  createActionComposition,
  MockActionRuntime,
  runComposedAction,
} from "../src/index";
import { CustomServiceWorkflow } from "./04-custom-services";

test("CustomServiceWorkflow runs without error", async () => {
  const mockRuntime = new MockActionRuntime();

  const composition = createActionComposition(
    {
      githubContext: { repo: { owner: "owner", repo: "repo" } },
      dependencies: {},
    },
    {
      runtime: mockRuntime,
    },
  );

  await runComposedAction(composition, CustomServiceWorkflow);

  expect(mockRuntime.logs).toEqual([
    { level: "info", message: ">>> STEP: Initializing" },
    { level: "info", message: ">>> STEP: Processing data" },
    { level: "info", message: ">>> STEP: Finished" },
  ]);
});
