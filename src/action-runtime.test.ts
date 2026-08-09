import * as core from "@actions/core";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { GitHubActionsRuntime, MockActionRuntime } from "./action-runtime";

describe("MockActionRuntime", () => {
  test("getBooleanInput reads true/false from inputs", () => {
    const runtime = new MockActionRuntime();
    runtime.inputs["enabled"] = "true";
    runtime.inputs["disabled"] = "false";

    expect(runtime.getBooleanInput("enabled")).toBe(true);
    expect(runtime.getBooleanInput("disabled")).toBe(false);
    expect(runtime.getBooleanInput("missing")).toBe(false);
  });

  test("setFailed records the failure and an error log", () => {
    const runtime = new MockActionRuntime();
    runtime.setFailed("boom");

    expect(runtime.failedMessage).toBe("boom");
    expect(runtime.logs).toContainEqual({ level: "error", message: "boom" });
  });

  test("warning appends a warning log", () => {
    const runtime = new MockActionRuntime();
    runtime.warning("careful");

    expect(runtime.logs).toContainEqual({
      level: "warning",
      message: "careful",
    });
  });

  test("setSecret stores secrets", () => {
    const runtime = new MockActionRuntime();
    runtime.setSecret("token-value");

    expect(runtime.secrets).toEqual(["token-value"]);
  });

  test("summary addRaw chains and write marks summaryWritten", async () => {
    const runtime = new MockActionRuntime();
    const chained = runtime.summary.addRaw("# Title").addRaw("\nbody");

    expect(chained).toBe(runtime.summary);
    expect(runtime.summaryRaw).toEqual(["# Title", "\nbody"]);
    expect(runtime.summaryWritten).toBe(false);

    await runtime.summary.write();
    expect(runtime.summaryWritten).toBe(true);
  });

  test("getInput throws when required input is missing", () => {
    const runtime = new MockActionRuntime();
    expect(() => runtime.getInput("name", { required: true })).toThrow(
      "Input required and not supplied: name",
    );
  });
});

describe("GitHubActionsRuntime", () => {
  const spies: ReturnType<typeof spyOn>[] = [];

  afterEach(() => {
    for (const spy of spies.splice(0)) {
      spy.mockRestore();
    }
  });

  test("delegates core helpers", () => {
    const runtime = new GitHubActionsRuntime();

    spies.push(
      spyOn(core, "getInput").mockReturnValue("Alice"),
      spyOn(core, "getBooleanInput").mockReturnValue(true),
      spyOn(core, "setOutput").mockImplementation(() => {}),
      spyOn(core, "setFailed").mockImplementation(() => {}),
      spyOn(core, "info").mockImplementation(() => {}),
      spyOn(core, "warning").mockImplementation(() => {}),
      spyOn(core, "setSecret").mockImplementation(() => {}),
      spyOn(core, "addPath").mockImplementation(() => {}),
    );

    expect(runtime.getInput("name", { required: true })).toBe("Alice");
    expect(core.getInput).toHaveBeenCalledWith("name", { required: true });

    expect(runtime.getBooleanInput("flag")).toBe(true);
    expect(core.getBooleanInput).toHaveBeenCalledWith("flag");

    runtime.setOutput("message", "hi");
    expect(core.setOutput).toHaveBeenCalledWith("message", "hi");

    runtime.setFailed("failed");
    expect(core.setFailed).toHaveBeenCalledWith("failed");

    runtime.info("info");
    expect(core.info).toHaveBeenCalledWith("info");

    runtime.warning("warn");
    expect(core.warning).toHaveBeenCalledWith("warn");

    runtime.setSecret("secret");
    expect(core.setSecret).toHaveBeenCalledWith("secret");

    runtime.addPath("/usr/local/bin");
    expect(core.addPath).toHaveBeenCalledWith("/usr/local/bin");
  });

  test("exposes core.summary", () => {
    const runtime = new GitHubActionsRuntime();
    expect(runtime.summary).toBe(core.summary);
  });
});
