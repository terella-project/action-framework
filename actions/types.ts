/**
 * Shared types for action workflows.
 */

/** GitHub event context passed to every action. */
export interface GithubContext {
  readonly owner: string;
  readonly repo: string;
  readonly ref: string;
  readonly eventName: string;
  readonly sha: string;
}

/** Semantic version components. */
export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** A pull request returned by gh pr list --json. */
export interface PullRequest {
  readonly number: number;
  readonly author: string;
  readonly isDraft: boolean;
  readonly mergeStateStatus: string;
}

/** A git tag entry returned by gh api repos/:owner/:repo/git/refs/tags. */
export interface GitTagRef {
  readonly ref: string;
}

/** Dependabot metadata from the fetch-metadata action. */
export interface DependabotMetadata {
  readonly updateType: string;
  readonly dependencyGroup: string;
}

/** CodeQL analysis language config. */
export interface CodeqlLanguage {
  readonly language: string;
  readonly buildMode: string;
}

/** CodeQL config parsed from action inputs. */
export interface CodeqlConfig {
  readonly languages: CodeqlLanguage[];
  readonly queries: string;
  readonly category: string;
}
