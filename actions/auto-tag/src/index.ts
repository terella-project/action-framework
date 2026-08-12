import { createActionComposition, runComposedAction } from "../../../src/index";
import { AutoTagWorkflow } from "./workflow.js";

const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

runComposedAction(composition, AutoTagWorkflow).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
