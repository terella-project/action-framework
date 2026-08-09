import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as exec from "@actions/exec";
import { DefaultExecClient } from "./exec-client";

describe("DefaultExecClient", () => {
  const spies: ReturnType<typeof spyOn>[] = [];

  afterEach(() => {
    for (const spy of spies.splice(0)) {
      spy.mockRestore();
    }
  });

  test("exec delegates to @actions/exec", async () => {
    const client = new DefaultExecClient();
    const options = { cwd: "/tmp" };
    spies.push(spyOn(exec, "exec").mockResolvedValue(0));

    await expect(client.exec("echo", ["hi"], options)).resolves.toBe(0);
    expect(exec.exec).toHaveBeenCalledWith("echo", ["hi"], options);
  });

  test("getExecOutput delegates to @actions/exec", async () => {
    const client = new DefaultExecClient();
    const output = {
      exitCode: 0,
      stdout: "ok\n",
      stderr: "",
    };
    spies.push(spyOn(exec, "getExecOutput").mockResolvedValue(output));

    await expect(client.getExecOutput("echo", ["hi"])).resolves.toEqual(output);
    expect(exec.getExecOutput).toHaveBeenCalledWith("echo", ["hi"], undefined);
  });
});
