import { createActionComposition, runComposedAction } from "../../../src/index";
import { CiWorkflow } from "./workflow.js";

const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

runComposedAction(composition, CiWorkflow).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
