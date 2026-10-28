import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { guidedReply } from "../src/lib/guide.ts";
import { bedrockReply, bedrockStream, getBedrockConfig } from "./bedrock.mjs";
export { bedrockReply, getBedrockConfig } from "./bedrock.mjs";
const { region, model } = getBedrockConfig();

export function describeBedrockError(error) {
  const status = error?.status ?? error?.$metadata?.httpStatusCode;
  const upstreamStatus = Number.isInteger(status) ? status : undefined;
  const connectionCode = error?.cause?.code || error?.code;
  let code = "BEDROCK_CONNECTION_ERROR";
  let message =
    "Could not connect to Bedrock. Check your Internet connection, HTTPS proxy, region, and the server terminal.";
  if (upstreamStatus === 401) {
    code = "BEDROCK_AUTH_FAILED";
    message =
      "Bedrock rejected the API key. Check that AWS_BEARER_TOKEN_BEDROCK contains a valid, unexpired Bedrock API key.";
  } else if (upstreamStatus === 403) {
    code = "BEDROCK_ACCESS_DENIED";
    message =
      "Access to the Bedrock endpoint was denied. Check API-key validity and expiry, model permissions, AWS account requirements, and any network or proxy restrictions.";
  } else if (upstreamStatus === 400 || upstreamStatus === 404) {
    code = "BEDROCK_MODEL_ERROR";
    message =
      "Bedrock could not use this model or request. Check BEDROCK_MODEL_ID, Converse support, and AWS_REGION. Some models require an inference-profile ID.";
  } else if (upstreamStatus === 429) {
    code = "BEDROCK_THROTTLED";
    message =
      "Bedrock's rate or usage limit was reached. Wait and retry, or check the account's Bedrock quotas.";
  } else if (upstreamStatus >= 500) {
    code = "BEDROCK_UNAVAILABLE";
    message = "Bedrock is temporarily unavailable. Try again shortly.";
  } else if (
    error?.name === "TimeoutError" ||
    error?.name === "AbortError" ||
    connectionCode === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    code = "BEDROCK_TIMEOUT";
    message =
      "The Bedrock request timed out. Check connectivity and proxy settings, then retry.";
  } else if (
    [
      "CERT_HAS_EXPIRED",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "SELF_SIGNED_CERT_IN_CHAIN",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
      "ERR_TLS_CERT_ALTNAME_INVALID",
    ].includes(connectionCode)
  ) {
    code = "BEDROCK_TLS_ERROR";
    message =
      "The secure Bedrock connection could not be verified. Check your certificate trust settings; a corporate proxy may require a trusted CA bundle in AWS_CA_BUNDLE.";
  }
  return {
    code,
    error: message,
    ...(upstreamStatus === undefined ? {} : { upstreamStatus }),
  };
}
export function validateRequest(body) {
  const { messages, context } = body ?? {};
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12)
    return false;
  if (
    !messages.every(
      (m) =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.text === "string" &&
        m.text.trim().length > 0 &&
        m.text.length <= 6000,
    )
  )
    return false;
  if (messages.at(-1).role !== "user" || messages.at(-1).text.length > 1200)
    return false;
  return (
    context &&
    Number.isInteger(context.monthly) &&
    context.monthly >= 100 &&
    context.monthly <= 2000 &&
    context.monthly % 50 === 0 &&
    [3, 5, 10, 15, 20].includes(context.years) &&
    ["steady", "balanced", "growth"].includes(context.risk)
  );
}
export function createApp({
  requestBedrock = bedrockReply,
  streamBedrock = bedrockStream,
  hasKey = () => getBedrockConfig().keyConfigured,
  production = false,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      coachMode: hasKey() ? "bedrock-configured" : "guided-demo",
      region,
      model,
    }),
  );
  // Modest in-memory throttling for a single-instance prototype. No conversation logging.
  const requests = new Map();
  app.post("/api/coach", async (req, res) => {
    if (!validateRequest(req.body))
      return res.status(400).json({ error: "Invalid coach request." });
    const now = Date.now();
    for (const [ip, entry] of requests)
      if (entry.until < now) requests.delete(ip);
    const address = req.socket.remoteAddress || "local";
    const entry = requests.get(address) || { count: 0, until: now + 60000 };
    if (++entry.count > 30)
      return res.status(429).json({
        error: "Please wait a moment before asking another question.",
      });
    requests.set(address, entry);
    const { context } = req.body;
    // Keep only the allowed data fields, and ensure the provider conversation starts with a user.
    const messages = [];
    for (const { role, text } of req.body.messages) {
      if (!messages.length && role !== "user") continue;
      const previous = messages.at(-1);
      if (previous?.role === role) previous.text += `\n\n${text}`;
      else messages.push({ role, text });
    }
    if (!hasKey())
      return res.json({
        text: guidedReply(
          messages.at(-1).text,
          context,
          messages.filter((m) => m.role === "user").at(-2)?.text,
        ),
        source: "guided",
      });
    if (req.get("accept")?.includes("application/x-ndjson")) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const onClose = () => controller.abort();
      res.once("close", onClose);
      res.set("Content-Type", "application/x-ndjson; charset=utf-8");
      res.set("X-Accel-Buffering", "no");
      res.flushHeaders();
      const send = (event) => {
        if (!res.destroyed) res.write(JSON.stringify(event) + "\n");
      };
      send({ type: "start", source: "bedrock" });
      let emitted = false;
      try {
        for await (const text of streamBedrock(messages, context, {
          signal: controller.signal,
        })) {
          if (controller.signal.aborted) break;
          emitted = true;
          send({ type: "delta", text });
        }
        if (!controller.signal.aborted) send({ type: "done" });
      } catch (error) {
        let failure = error;
        const status = error?.status ?? error?.$metadata?.httpStatusCode;
        // Older models or keys may allow Converse but not ConverseStream.
        // Retry a normal reply only before any text has been emitted.
        if (
          !emitted &&
          !res.destroyed &&
          !controller.signal.aborted &&
          [400, 403].includes(status)
        ) {
          try {
            const text = await requestBedrock(messages, context, {
              signal: controller.signal,
            });
            if (!controller.signal.aborted) {
              send({ type: "delta", text });
              send({ type: "done" });
            }
            failure = null;
          } catch (fallbackError) {
            failure = fallbackError;
          }
        }
        if (failure && !res.destroyed) {
          const diagnostic = describeBedrockError(failure);
          console.warn("Live coach unavailable:", diagnostic.code);
          send({ type: "error", ...diagnostic });
        }
      } finally {
        clearTimeout(timeout);
        res.removeListener("close", onClose);
        if (!res.destroyed) res.end();
      }
      return;
    }
    try {
      return res.json({
        text: await requestBedrock(messages, context),
        source: "bedrock",
      });
    } catch (error) {
      const diagnostic = describeBedrockError(error);
      console.warn(
        "Live coach unavailable:",
        diagnostic.code,
        diagnostic.upstreamStatus ? `HTTP ${diagnostic.upstreamStatus}` : "",
        diagnostic.error,
      );
      return res.status(503).json(diagnostic);
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  if (production) {
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../dist",
    );
    app.use(express.static(root));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(path.join(root, "index.html")),
    );
  }
  app.use((error, _req, res, _next) =>
    res
      .status(error.status === 413 ? 413 : 400)
      .json({ error: "The request could not be read." }),
  );
  return app;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const production = process.argv.includes("--production");
  const port = Number(process.env.PORT || 3001);
  const server = createApp({ production }).listen(port, "0.0.0.0", () =>
    console.log(
      `Investment Coach ${production ? "app" : "API"} listening on port ${port}. Coach: ${getBedrockConfig().keyConfigured ? "Bedrock configured" : "guided demo"}.`,
    ),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => server.close(() => process.exit(0)));
}
