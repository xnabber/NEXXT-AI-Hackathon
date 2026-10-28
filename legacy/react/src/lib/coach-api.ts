import type { GuideContext } from "./guide";
export type CoachReply = { text: string; source: "guided" | "bedrock" };
type ChatTurn = { role: "user" | "assistant"; text: string };
export async function requestCoach(
  messages: ChatTurn[],
  context: GuideContext,
  onDelta: (text: string) => void,
  signal: AbortSignal,
): Promise<CoachReply> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    },
    body: JSON.stringify({ messages, context }),
    signal,
  });
  if (!response.ok) throw new Error("Live coach unavailable");
  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const reply = await response.json();
    if (
      typeof reply.text !== "string" ||
      !reply.text.trim() ||
      !["bedrock", "guided"].includes(reply.source)
    )
      throw new Error("Invalid coach reply");
    return reply;
  }
  if (!response.body) throw new Error("Missing response stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "",
    text = "",
    done = false;
  function consume(line: string) {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "error") throw new Error("Live coach interrupted");
    if (event.type === "delta" && typeof event.text === "string") {
      text += event.text;
      onDelta(text);
    }
    if (event.type === "done") done = true;
  }
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
      if (chunk.done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!done || !text.trim()) throw new Error("Incomplete coach reply");
    return { text, source: "bedrock" };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
