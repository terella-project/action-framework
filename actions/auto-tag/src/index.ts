import {
  createActionComposition,
  DefaultExecClient,
  runComposedAction,
} from "../../../src/index";
import { AutoTagWorkflow } from "./workflow.js";

const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {
    createExecClient: () => new DefaultExecClient(),
  },
});

runComposedAction(composition, AutoTagWorkflow).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
