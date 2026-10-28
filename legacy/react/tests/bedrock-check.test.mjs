import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkBedrock } from "../server/check-bedrock.mjs";
import { describeBedrockError } from "../server/index.mjs";
const config = {
  region: "us-west-2",
  model: "us.amazon.nova-lite-v1:0",
  keyConfigured: false,
};

describe("local Bedrock diagnostic command", () => {
  it("explains the missing key without making a provider call", async () => {
    const output = [],
      failures = [];
    const ok = await checkBedrock({
      config,
      invoke: () => {
        throw new Error("Should not be called");
      },
      out: (text) => output.push(text),
      fail: (text) => failures.push(text),
    });
    expect(ok).toBe(false);
    expect(failures.join("\n")).toContain(
      "Cloud environment secrets are not copied to your computer",
    );
    expect(failures.join("\n")).toContain(".env");
  });
  it("confirms a real invocation path using a provider stub without inventing credentials", async () => {
    const output = [];
    let called = false;
    const ok = await checkBedrock({
      config: { ...config, keyConfigured: true },
      invoke: async (messages) => {
        called = true;
        expect(messages.at(-1).text).toBe("Reply with OK.");
        return "OK";
      },
      out: (text) => output.push(text),
      fail: () => {
        throw new Error("Unexpected failure");
      },
    });
    expect(called).toBe(true);
    expect(ok).toBe(true);
    expect(output).toContain("Bedrock connection succeeded.");
  });
  it("reports authorization failure without printing provider error contents", async () => {
    const failures = [];
    const ok = await checkBedrock({
      config: { ...config, keyConfigured: true },
      invoke: async () => {
        throw Object.assign(new Error("private provider details"), {
          status: 403,
        });
      },
      out: () => {},
      fail: (text) => failures.push(text),
    });
    expect(ok).toBe(false);
    expect(failures.join()).toContain("BEDROCK_ACCESS_DENIED (HTTP 403)");
    expect(failures.join()).not.toContain("private provider details");
  });
  it.each([
    [
      Object.assign(new Error("private details"), { name: "TimeoutError" }),
      "BEDROCK_TIMEOUT",
    ],
    [
      Object.assign(new Error("private details"), {
        cause: { code: "SELF_SIGNED_CERT_IN_CHAIN" },
      }),
      "BEDROCK_TLS_ERROR",
    ],
  ])("distinguishes timeout and certificate failures", (error, code) => {
    expect(describeBedrockError(error).code).toBe(code);
    expect(describeBedrockError(error).error).not.toContain("private details");
  });
  it("loads a local .env in an isolated CLI process and exits unsuccessfully when no key exists", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "bedrock-cli-test-"));
    try {
      // Contains non-secret configuration only; no actual credentials are copied or written.
      writeFileSync(
        path.join(directory, ".env"),
        "AWS_REGION=eu-central-1\nBEDROCK_MODEL_ID=local-test-model\nAWS_BEARER_TOKEN_BEDROCK=\n",
      );
      const childEnv = { ...process.env };
      // Simulate a local clone without cloud-provided Bedrock configuration.
      delete childEnv.AWS_REGION;
      delete childEnv.BEDROCK_MODEL_ID;
      delete childEnv.AWS_BEARER_TOKEN_BEDROCK;
      const result = spawnSync(
        process.execPath,
        ["--env-file-if-exists=.env", path.resolve("server/check-bedrock.mjs")],
        { cwd: directory, env: childEnv, encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("Bedrock region: eu-central-1");
      expect(result.stdout).toContain("Bedrock model: local-test-model");
      expect(result.stderr).toContain("No Bedrock API key is configured");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
