import {
  bedrockReply,
  describeBedrockError,
  getBedrockConfig,
} from "./index.mjs";

export async function checkBedrock({
  config = getBedrockConfig(),
  invoke = bedrockReply,
  out = console.log,
  fail = console.error,
} = {}) {
  out(`Bedrock region: ${config.region}`);
  out(`Bedrock model: ${config.model}`);
  if (!config.keyConfigured) {
    fail(
      "No Bedrock API key is configured. Copy .env.example to .env, set AWS_BEARER_TOKEN_BEDROCK to your actual Bedrock API key, then rerun npm run bedrock:test. Cloud environment secrets are not copied to your computer.",
    );
    return false;
  }
  out("API key: configured (value hidden). Sending one short model request…");
  try {
    const reply = await invoke([{ role: "user", text: "Reply with OK." }], {
      monthly: 500,
      years: 10,
      risk: "balanced",
    });
    if (typeof reply !== "string" || !reply.trim())
      throw new Error("Empty reply");
    out("Bedrock connection succeeded.");
    out(`Model reply: ${reply}`);
    return true;
  } catch (error) {
    const diagnostic = describeBedrockError(error);
    fail(
      `${diagnostic.code}${diagnostic.upstreamStatus ? ` (HTTP ${diagnostic.upstreamStatus})` : ""}: ${diagnostic.error}`,
    );
    return false;
  }
}
// Running this check sends a small paid inference request only when a key is configured.
if (import.meta.main) process.exitCode = (await checkBedrock()) ? 0 : 1;
