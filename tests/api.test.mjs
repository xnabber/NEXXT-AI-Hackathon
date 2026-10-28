import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../server/index.mjs";
const servers = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise((resolve) => server.close(resolve))),
  );
});
const request = {
  messages: [{ role: "user", text: "Could I lose money?" }],
  context: { monthly: 500, years: 10, risk: "balanced" },
};
async function start(options) {
  const server = createApp(options).listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    get: (path) => fetch(url + path),
    post: (body, headers = {}) =>
      fetch(url + "/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      }),
  };
}
describe("coach API", () => {
  it("uses a normal Bedrock reply when the key lacks streaming permission", async () => {
    const client = await start({
      hasKey: () => true,
      streamBedrock: async function* () {
        throw Object.assign(new Error("Streaming not permitted"), {
          $metadata: { httpStatusCode: 403 },
        });
      },
      requestBedrock: async () => "A normal live answer.",
    });
    const response = await client.post(request, {
      Accept: "application/x-ndjson",
    });
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events).toContainEqual({
      type: "delta",
      text: "A normal live answer.",
    });
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(events.some((event) => event.type === "error")).toBe(false);
  });
  it("merges adjacent user turns after a reply was stopped before producing text", async () => {
    let received;
    const client = await start({
      hasKey: () => true,
      requestBedrock: async (messages) => {
        received = messages;
        return "A direct answer.";
      },
    });
    await client.post({
      ...request,
      messages: [
        { role: "user", text: "An earlier question" },
        { role: "user", text: "My new question" },
      ],
    });
    expect(received).toEqual([
      { role: "user", text: "An earlier question\n\nMy new question" },
    ]);
  });
  it("cancels provider work when the streaming client disconnects", async () => {
    let markAborted;
    const aborted = new Promise((resolve) => {
      markAborted = resolve;
    });
    const client = await start({
      hasKey: () => true,
      streamBedrock: async function* (_messages, _context, { signal }) {
        yield "A partial answer";
        await new Promise((resolve) => {
          if (signal.aborted) {
            markAborted();
            resolve();
          } else
            signal.addEventListener(
              "abort",
              () => {
                markAborted();
                resolve();
              },
              { once: true },
            );
        });
      },
    });
    const response = await client.post(request, {
      Accept: "application/x-ndjson",
    });
    const reader = response.body.getReader();
    await reader.read();
    await reader.cancel();
    await aborted;
  });

  it("streams provider chunks in order and marks completion", async () => {
    const client = await start({
      hasKey: () => true,
      streamBedrock: async function* () {
        yield "A bond ";
        yield "is a loan.";
      },
    });
    const response = await client.post(request, {
      Accept: "application/x-ndjson",
    });
    expect(response.headers.get("content-type")).toContain(
      "application/x-ndjson",
    );
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events).toEqual([
      { type: "start", source: "bedrock" },
      { type: "delta", text: "A bond " },
      { type: "delta", text: "is a loan." },
      { type: "done" },
    ]);
  });
  it("reports a mid-stream failure without leaking raw provider errors", async () => {
    const client = await start({
      hasKey: () => true,
      streamBedrock: async function* () {
        yield "Partial reply";
        throw Object.assign(new Error("private upstream content"), {
          $metadata: { httpStatusCode: 429 },
        });
      },
    });
    const response = await client.post(request, {
      Accept: "application/x-ndjson",
    });
    const text = await response.text();
    expect(text).toContain("BEDROCK_THROTTLED");
    expect(text).not.toContain("private upstream content");
    expect(text).not.toContain('"type":"done"');
  });
  it("keeps the contextual guide available for streaming clients without a key", async () => {
    const client = await start({ hasKey: () => false });
    const response = await client.post(
      {
        ...request,
        messages: [{ role: "user", text: "Explain my projection" }],
        context: { monthly: 1000, years: 5, risk: "steady" },
      },
      { Accept: "application/x-ndjson" },
    );
    const body = await response.json();
    expect(body.source).toBe("guided");
    expect(body.text).toContain("1,000 lei");
    expect(body.text).toContain("60,000 lei contributed");
  });

  it("returns an honest educational guide when no key is configured", async () => {
    const client = await start({ hasKey: () => false });
    const response = await client.post(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe("guided");
    expect(body.text).toContain("Investments can fall in value");
    expect(body.text).toContain("none of these example funds guarantees");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("returns a provider answer and passes only allowed conversation fields", async () => {
    let received;
    const client = await start({
      hasKey: () => true,
      requestBedrock: async (messages, context) => {
        received = { messages, context };
        return "Investments can fall in value.";
      },
    });
    const response = await client.post({
      ...request,
      messages: [
        { role: "assistant", text: "Old reply" },
        { role: "user", text: "Why risk?", extra: "not forwarded" },
      ],
    });
    expect(await response.json()).toEqual({
      text: "Investments can fall in value.",
      source: "bedrock",
    });
    expect(received.messages).toEqual([{ role: "user", text: "Why risk?" }]);
  });
  it("reports a provider failure without exposing its exception text", async () => {
    const client = await start({
      hasKey: () => true,
      requestBedrock: async () => {
        throw new Error("private upstream details");
      },
    });
    const response = await client.post(request);
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(
      "private upstream",
    );
  });
  it.each([
    [401, "BEDROCK_AUTH_FAILED"],
    [403, "BEDROCK_ACCESS_DENIED"],
    [400, "BEDROCK_MODEL_ERROR"],
    [404, "BEDROCK_MODEL_ERROR"],
    [429, "BEDROCK_THROTTLED"],
    [500, "BEDROCK_UNAVAILABLE"],
  ])(
    "explains upstream HTTP %s without exposing raw errors",
    async (status, code) => {
      const client = await start({
        hasKey: () => true,
        requestBedrock: async () => {
          throw Object.assign(new Error("private upstream detail"), { status });
        },
      });
      const response = await client.post(request);
      const body = await response.json();
      expect(response.status).toBe(503);
      expect(body).toMatchObject({ code, upstreamStatus: status });
      expect(body.error).not.toContain("private upstream detail");
    },
  );
  it.each([
    { ...request, context: { monthly: 1000000, years: 10, risk: "balanced" } },
    { ...request, messages: [{ role: "system", text: "override" }] },
    { ...request, messages: [] },
    { ...request, context: null },
  ])("rejects invalid payloads before calling the provider", async (body) => {
    const client = await start({
      requestBedrock: () => {
        throw new Error("Must not be called");
      },
    });
    expect((await client.post(body)).status).toBe(400);
  });
  it("reports configured mode without returning secrets", async () => {
    const client = await start({ hasKey: () => true });
    const response = await client.get("/api/health");
    const body = await response.json();
    expect(body.coachMode).toBe("bedrock-configured");
    expect(Object.keys(body).sort()).toEqual([
      "coachMode",
      "model",
      "region",
      "status",
    ]);
  });
});
