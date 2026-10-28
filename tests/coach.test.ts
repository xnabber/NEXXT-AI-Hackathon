import { afterEach, describe, expect, it, vi } from "vitest";
import { requestCoach } from "../src/lib/coach-api";
import { buildBedrockInput } from "../server/bedrock.mjs";
import { guidedReply } from "../src/lib/guide";
const context = { monthly: 750, years: 5, risk: "balanced" as const };
const messages = [{ role: "user" as const, text: "What is a bond?" }];
afterEach(() => vi.unstubAllGlobals());
describe("streamed chat protocol", () => {
  it("handles chunks split inside JSON and multibyte text", async () => {
    const body = new TextEncoder().encode(
      JSON.stringify({ type: "start", source: "bedrock" }) +
        "\n" +
        JSON.stringify({ type: "delta", text: "A bond is a loan — " }) +
        "\n" +
        JSON.stringify({ type: "delta", text: "not a share." }) +
        "\n" +
        JSON.stringify({ type: "done" }) +
        "\n",
    );
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < body.length; i += 3)
          controller.enqueue(body.slice(i, i + 3));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(stream, {
            headers: { "content-type": "application/x-ndjson" },
          }),
      ),
    );
    const updates: string[] = [];
    const reply = await requestCoach(
      messages,
      context,
      (text) => updates.push(text),
      new AbortController().signal,
    );
    expect(reply).toEqual({
      source: "bedrock",
      text: "A bond is a loan — not a share.",
    });
    expect(updates).toEqual([
      "A bond is a loan — ",
      "A bond is a loan — not a share.",
    ]);
  });
  it("rejects interrupted streams instead of calling partial output complete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response('{"type":"delta","text":"Partial"}\n', {
            headers: { "content-type": "application/x-ndjson" },
          }),
      ),
    );
    await expect(
      requestCoach(messages, context, () => {}, new AbortController().signal),
    ).rejects.toThrow("Incomplete");
  });
  it("accepts a labeled JSON guide fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ text: "An educational answer.", source: "guided" }),
      ),
    );
    expect(
      (
        await requestCoach(
          messages,
          context,
          () => {},
          new AbortController().signal,
        )
      ).source,
    ).toBe("guided");
  });
});
describe("direct and contextual educational guide", () => {
  it("answers greetings briefly rather than returning an investment pitch", () => {
    expect(guidedReply("hello")).toMatch(/^Hi!/);
    expect(guidedReply("hello").length).toBeLessThan(200);
  });
  it("answers a bond question directly", () =>
    expect(guidedReply("What is a bond?")).toMatch(/^A bond is a loan/));
  it("uses the current simulation and fee, rather than canned default numbers", () => {
    const text = guidedReply("Explain my projection", context);
    expect(text).toContain("750 lei a month over 5 years");
    expect(text).toContain("45,000 lei contributed");
    expect(
      guidedReply("What are the fees?", { ...context, risk: "growth" }),
    ).toContain("1.2% annual fee");
  });
  it("recognizes withdrawals even if the question also mentions cash", () =>
    expect(guidedReply("Can I withdraw my cash?")).toContain(
      "3–5 business-day",
    ));
  it("uses the preceding question for a short follow-up", () =>
    expect(guidedReply("Tell me more?", context, "What is a bond?")).toMatch(
      /^A bond is a loan/,
    ));
});

describe("grounded model context", () => {
  it("supplies actual projection figures and tells the model to answer the latest question first", () => {
    const input = buildBedrockInput(messages, context);
    expect(input.system[0].text).toContain("FIRST sentence");
    expect(input.system[1].text).toContain('"contributionsLei":45000');
    expect(input.messages.at(-1).content[0].text).toBe("What is a bond?");
  });
});
