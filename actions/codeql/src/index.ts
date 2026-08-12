import { createActionComposition, runComposedAction } from "../../../src/index";
import { CodeqlWorkflow } from "./workflow.js";

const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

runComposedAction(composition, CodeqlWorkflow).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
