import * as core from "@actions/core";

export interface SummaryWriter {
  addRaw(content: string): SummaryWriter;
  write(): Promise<unknown>;
}

export interface ActionRuntime {
  getInput(name: string, options?: { required?: boolean }): string;
  getBooleanInput(name: string): boolean;
  setOutput(name: string, value: unknown): void;
  setFailed(message: string): void;
  info(message: string): void;
  warning(message: string): void;
  setSecret(secret: string): void;
  addPath(path: string): void;
  readonly summary: SummaryWriter;
}

export class GitHubActionsRuntime implements ActionRuntime {
  readonly summary: SummaryWriter = core.summary;

  getInput(name: string, options?: { required?: boolean }): string {
    return core.getInput(name, options);
  }

  getBooleanInput(name: string): boolean {
    return core.getBooleanInput(name);
  }

  setOutput(name: string, value: unknown): void {
    core.setOutput(name, value);
  }

  setFailed(message: string): void {
    core.setFailed(message);
  }

  info(message: string): void {
    core.info(message);
  }

  warning(message: string): void {
    core.warning(message);
  }

  setSecret(secret: string): void {
    core.setSecret(secret);
  }

  addPath(path: string): void {
    core.addPath(path);
  }
}

export class MockActionRuntime implements ActionRuntime {
  inputs: Record<string, string> = {};
  outputs: Record<string, unknown> = {};
  secrets: string[] = [];
  paths: string[] = [];
  failedMessage?: string;
  logs: { level: string; message: string }[] = [];

  readonly summary: SummaryWriter = {
    addRaw: (content: string) => {
      this.summaryRaw.push(content);
      return this.summary;
    },
    write: async () => {
      this.summaryWritten = true;
    },
  };

  summaryRaw: string[] = [];
  summaryWritten = false;

  getInput(name: string, options?: { required?: boolean }): string {
    const val = this.inputs[name];
    if (options?.required && !val) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return val ?? "";
  }

  getBooleanInput(name: string): boolean {
    const val = this.inputs[name];
    return val === "true";
  }

  setOutput(name: string, value: unknown): void {
    this.outputs[name] = value;
  }

  setFailed(message: string): void {
    this.failedMessage = message;
    this.logs.push({ level: "error", message });
  }

  info(message: string): void {
    this.logs.push({ level: "info", message });
  }

  warning(message: string): void {
    this.logs.push({ level: "warning", message });
  }

  setSecret(secret: string): void {
    this.secrets.push(secret);
  }

  addPath(path: string): void {
    this.paths.push(path);
  }
}
