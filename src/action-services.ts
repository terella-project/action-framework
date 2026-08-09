import {
  Component as Inject,
  Container as InjectableService,
} from "@di-framework/core/decorators";

export {
  Component as Inject,
  Container as InjectableService,
  Container as InjectableWorkflow,
} from "@di-framework/core/decorators";

import { ACTION_COMPONENTS } from "./action-composition";
import type { ExecClient } from "./exec-client";

export interface GitHubClientPort {
  // Generic GitHub client interface if needed, or just use any/unknown if we want to be very lightweight.
  // Given that GitHubClient in action-common is very Terella specific,
  // we might want a minimal interface here or just depend on the user providing it.
  [key: string]: any;
}

export interface GithubActionContext {
  readonly repo: { owner: string; repo: string };
}

export interface GitHubPortDependencies<TClient = GitHubClientPort> {
  readonly createGitHubClient: (
    token: string,
    owner: string,
    repo: string,
  ) => TClient;
  readonly createExecClient: () => ExecClient;
}

export interface GitHubActionPorts<TClient = GitHubClientPort> {
  readonly gh: TClient;
  readonly exec: ExecClient;
}

@InjectableService({ singleton: false })
export class GitHubActionPortFactory<TClient = GitHubClientPort> {
  constructor(
    @Inject(ACTION_COMPONENTS.githubContext)
    private readonly githubContext: GithubActionContext,
    @Inject(ACTION_COMPONENTS.mainDependencies)
    private readonly deps: GitHubPortDependencies<TClient>,
  ) {}

  create(token: string): GitHubActionPorts<TClient> {
    const { owner, repo } = this.githubContext.repo;
    return {
      gh: this.deps.createGitHubClient(token, owner, repo),
      exec: this.deps.createExecClient(),
    };
  }
}
