import { createActionComposition, runComposedAction } from "../../../src/index";
import { PublishWorkflow } from "./workflow.js";

const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

runComposedAction(composition, PublishWorkflow).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
