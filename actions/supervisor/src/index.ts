import { createActionComposition, runComposedAction } from "../../../src/index";
import { SupervisorWorkflow } from "./workflow.js";

const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

runComposedAction(composition, SupervisorWorkflow).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
