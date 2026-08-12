import { createActionComposition, runComposedAction } from "../../../src/index";
import { DependabotAutoMergeWorkflow } from "./workflow.js";

const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

runComposedAction(composition, DependabotAutoMergeWorkflow).catch(
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
