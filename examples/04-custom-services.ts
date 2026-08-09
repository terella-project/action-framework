import {
  ACTION_COMPONENTS,
  type ActionRuntime,
  createActionComposition,
  Inject,
  InjectableService,
  InjectableWorkflow,
  runComposedAction,
} from "../src/index";

/**
 * A custom service that can be injected.
 */
@InjectableService()
export class LoggerService {
  constructor(
    @Inject(ACTION_COMPONENTS.actionRuntime)
    private readonly runtime: ActionRuntime,
  ) {}

  logStep(name: string): void {
    this.runtime.info(`>>> STEP: ${name}`);
  }
}

/**
 * A workflow using the custom service.
 */
@InjectableWorkflow()
export class CustomServiceWorkflow {
  constructor(
    @Inject(LoggerService)
    private readonly logger: LoggerService,
  ) {}

  async run(): Promise<void> {
    this.logger.logStep("Initializing");
    this.logger.logStep("Processing data");
    this.logger.logStep("Finished");
  }
}

// Composition setup
const composition = createActionComposition({
  githubContext: { repo: { owner: "owner", repo: "repo" } },
  dependencies: {},
});

// Run the action (when run directly)
if (import.meta.url.endsWith(process.argv[1])) {
  runComposedAction(composition, CustomServiceWorkflow).catch(console.error);
}
