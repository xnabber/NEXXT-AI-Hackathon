import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  CircleHelp,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  Square,
  BookOpen,
  ChartNoAxesCombined,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Disclosure } from "./components/Layout";
import { MonthlyControl, Simulator } from "./components/Simulator";
import { useJourney } from "./lib/journey";
import { guidedReply } from "./lib/guide";
import { requestCoach } from "./lib/coach-api";
import { money, products, project } from "./lib/finance";
import type { Risk } from "./lib/finance";
import type { Message } from "./lib/journey";
const welcome =
  "Hi! I’m your Investment Coach. Ask me about investing or your simulation, and I’ll explain the numbers in plain language. What would you like to understand?";
const questions = [
  "How much could you comfortably set aside each month?",
  "When might you want to use this money?",
  "How do you feel about the ups and downs?",
];
const newMessage = (
  role: Message["role"],
  text: string,
  source?: Message["source"],
): Message => ({ id: crypto.randomUUID(), role, text, source });
export default function Coach() {
  const { state, update } = useJourney();
  const product = products.find((p) => p.id === state.risk)!;
  const mobileProjection = project(
    state.monthly,
    state.years,
    product.grossReturn,
    product.fee,
  );
  const [input, setInput] = useState("");
  const [partial, setPartial] = useState("");
  const partialRef = useRef("");
  const stopped = useRef(false);
  const mounted = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [live, setLive] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatBody = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    const field = inputRef.current;
    if (field) {
      field.style.height = "auto";
      field.style.height = `${Math.min(field.scrollHeight, 128)}px`;
    }
  }, [input]);
  useEffect(() => {
    const body = chatBody.current;
    if (state.messages.length && body) {
      body.scrollTo({
        top: body.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }, [state.messages.length, busy, partial]);
  const addAnswer = (
    answer: string,
    response: string,
    patch: Partial<typeof state> = {},
  ) =>
    update((current) => ({
      ...patch,
      question: Math.min(3, current.question + 1),
      messages: [
        ...current.messages,
        { ...newMessage("user", answer), kind: "setup" },
        { ...newMessage("assistant", response, "guided"), kind: "setup" },
      ],
    }));
  async function ask(text = input) {
    if (!text.trim() || busy) return;
    const question = text.trim().slice(0, 1200);
    setInput("");
    setBusy(true);
    setChatError("");
    setUnavailable(false);
    setPartial("");
    partialRef.current = "";
    stopped.current = false;
    const messages = [...state.messages, newMessage("user", question)].slice(
      -38,
    );
    update({ messages });
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 35000);
    const context = {
      monthly: state.monthly,
      years: state.years,
      risk: state.risk,
    };
    try {
      const reply = await requestCoach(
        messages
          .filter((m) => m.kind !== "setup")
          .slice(-12)
          .map((m) => ({ role: m.role, text: m.text })),
        context,
        (text) => {
          partialRef.current = text;
          if (mounted.current) setPartial(text);
        },
        controller.current.signal,
      );
      if (!mounted.current) return;
      update((current) => ({
        messages: [
          ...current.messages,
          newMessage("assistant", reply.text, reply.source),
        ].slice(-40),
      }));
      setLive(reply.source === "bedrock");
    } catch {
      if (!mounted.current) return;
      if (stopped.current) {
        if (partialRef.current.trim()) {
          const message = {
            ...newMessage("assistant", partialRef.current, "bedrock"),
            status: "stopped" as const,
          };
          update((current) => ({
            messages: [...current.messages, message].slice(-40),
          }));
          setLive(true);
        }
        setChatError(
          "Response stopped. You can edit your question or ask another.",
        );
      } else {
        const previousQuestion = messages
          .filter((m) => m.role === "user" && m.kind !== "setup")
          .at(-2)?.text;
        update((current) => ({
          messages: [
            ...current.messages,
            newMessage(
              "assistant",
              guidedReply(question, context, previousQuestion),
              "guided",
            ),
          ].slice(-40),
        }));
        setUnavailable(true);
        setChatError(
          "The live coach is unavailable. Your question was answered by the educational guide.",
        );
      }
    } finally {
      clearTimeout(timeout);
      if (mounted.current) {
        setBusy(false);
        setPartial("");
      }
    }
  }
  function stopResponse() {
    stopped.current = true;
    controller.current?.abort();
  }
  return (
    <main className="coach-page container">
      <div className="coach-page-top">
        <Link className="back-link" to="/">
          <ChevronLeft size={16} /> Back to the big picture
        </Link>
        <span className="educational-pill">
          <ShieldCheck size={13} /> Educational simulation · No commitment
        </span>
      </div>
      <div className="coach-heading">
        <div>
          <div className="eyebrow">
            <span /> A CONVERSATION ABOUT YOUR FUTURE
          </div>
          <h1>
            Let’s make your money
            <br className="mobile-only" /> make sense.
          </h1>
          <p>
            No perfect answers needed. Just a starting point that feels like
            you.
          </p>
        </div>
        <span className="coach-heading-decoration">
          <Sparkles size={30} strokeWidth={1.3} />
        </span>
      </div>
      <nav className="coach-section-nav" aria-label="Coach sections">
        <a href="#preferences-title">My scenario</a>
        <a href="#coach-chat-title">Ask your coach</a>
        <a href="#simulator-title">Projection</a>
      </nav>
      <div className="coach-grid">
        <section
          className="coach-preferences"
          aria-labelledby="preferences-title"
        >
          <div className="preferences-heading">
            <div>
              <div className="eyebrow">YOUR SIMULATION</div>
              <h2 id="preferences-title">Your starting point</h2>
            </div>
            <span className="chat-header-step">
              {state.question < 3 ? (
                `0${state.question + 1} / 03`
              ) : (
                <Check size={18} />
              )}
            </span>
          </div>
          {state.question !== 0 && (
            <div className="monthly-adjustment">
              <span className="monthly-adjustment-label">
                Monthly investment
              </span>
              <MonthlyControl compact />
            </div>
          )}
          {state.question < 3 ? (
            <div className="question-panel">
              <div className="question-label">
                QUESTION {state.question + 1} OF 3
              </div>
              <h3>{questions[state.question]}</h3>
              {state.question === 0 && (
                <MonthlyControl
                  onContinue={() =>
                    addAnswer(
                      `${money(state.monthly)} lei a month feels comfortable.`,
                      `A thoughtful starting point. ${money(state.monthly)} lei a month adds up to ${money(state.monthly * 12)} lei in a year, before any returns. Keep your everyday needs and emergency savings covered first.`,
                    )
                  }
                />
              )}
              {state.question === 1 && (
                <div className="choice-stack">
                  {[
                    {
                      y: 3,
                      title: "In a few years",
                      text: "Around 3 years · a nearer-term goal",
                    },
                    {
                      y: 5,
                      title: "A little further ahead",
                      text: "Around 5 years · room to build a habit",
                    },
                    {
                      y: 10,
                      title: "I’m thinking long term",
                      text: "10 years or more · a future me goal",
                    },
                  ].map((item) => (
                    <button
                      key={item.y}
                      onClick={() =>
                        addAnswer(
                          `I’m thinking about ${item.y} years.`,
                          `We’ll use ${item.y} years for your simulation. A longer horizon gives more time to ride out market movements, but returns are never guaranteed. Keep money for short-term needs readily accessible.`,
                          { years: item.y },
                        )
                      }
                    >
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.text}</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                </div>
              )}
              {state.question === 2 && (
                <div className="choice-stack">
                  {[
                    {
                      risk: "steady" as Risk,
                      title: "I’d prefer a steadier ride",
                      text: "I’m cautious about changes in value.",
                    },
                    {
                      risk: "balanced" as Risk,
                      title: "Some ups and downs are okay",
                      text: "I want to understand the balance.",
                    },
                    {
                      risk: "growth" as Risk,
                      title: "I can take a longer view",
                      text: "I understand bigger falls can happen.",
                    },
                  ].map((item) => (
                    <button
                      key={item.risk}
                      onClick={() =>
                        addAnswer(
                          item.title,
                          "Thanks for sharing. Your simulation is ready to explore. These three answers are a starting point for learning, not a suitability assessment or investment recommendation. You can change the numbers, ask me anything, or explore the example funds.",
                          { risk: item.risk, productId: item.risk },
                        )
                      }
                    >
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.text}</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="conversation-complete">
              <span className="complete-check">
                <Check size={18} />
              </span>
              <div>
                <h3>A little clearer already.</h3>
                <p>
                  Your {money(state.monthly)} lei/month, {state.years}-year
                  scenario is saved.
                </p>
              </div>
              <Button asChild>
                <Link
                  to={state.authenticated ? "/account/invest" : "/onboarding"}
                >
                  Explore my options <ArrowUpRight size={17} />
                </Link>
              </Button>
              <button
                className="text-button"
                onClick={() => update({ question: 0 })}
              >
                Revisit my answers
              </button>
            </div>
          )}
        </section>
        <section className="chat-card" aria-labelledby="coach-chat-title">
          <div className="chat-header">
            <span className="coach-orb">
              <Sprout size={23} />
            </span>
            <div>
              <h2 id="coach-chat-title">Your Investment Coach</h2>
              <span>
                <i className="green-dot" />
                {live ? "AI coach · here to help" : "Your educational guide"}
              </span>
            </div>
          </div>
          <div className="chat-body" ref={chatBody}>
            <div className="chat-welcome">
              <span className="message-avatar">
                <Sprout size={15} />
              </span>
              <div>
                <p>{welcome}</p>
                <span className="message-note">
                  About two minutes. No account needed to explore.
                </span>
              </div>
            </div>
            {!state.messages.some((m) => m.kind !== "setup") && (
              <div className="chat-starters">
                <span className="starter-caption">
                  A little clarity starts with a question
                </span>
                <button
                  disabled={busy}
                  onClick={() => ask("How do investment funds work?")}
                >
                  <BookOpen size={23} />
                  <span>
                    <strong>Understand the basics</strong>
                    <small>
                      Funds, bonds, and investing — explained simply.
                    </small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    ask(
                      "Explain my projection. How much is money I contribute, and how much is illustrative growth?",
                    )
                  }
                >
                  <ChartNoAxesCombined size={23} />
                  <span>
                    <strong>Make sense of my numbers</strong>
                    <small>See what the scenario means for your money.</small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              </div>
            )}
            <div
              className="message-list"
              aria-live="polite"
              aria-relevant="additions"
              aria-busy={busy}
            >
              {state.messages.map((m) => (
                <div key={m.id} className={`message ${m.role}`}>
                  {m.role === "assistant" && (
                    <span className="message-avatar">
                      <Sprout size={14} />
                    </span>
                  )}
                  <div className="message-bubble">
                    {m.text}
                    {m.status === "stopped" && (
                      <span className="message-stopped">Response stopped</span>
                    )}
                    {m.source === "bedrock" && (
                      <span className="message-source">
                        <Sparkles size={10} /> AI response
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="message assistant">
                  <span className="message-avatar">
                    <Sprout size={14} />
                  </span>
                  {partial ? (
                    <div
                      className="message-bubble streaming-reply"
                      aria-live="off"
                    >
                      {partial}
                      <span className="stream-caret" aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="message-bubble typing" role="status">
                      <span className="typing-dots" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>{" "}
                      Reading your question…
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="chat-composer-area">
            <div className="quick-replies">
              {[
                "Explain my projection",
                "Could I lose money?",
                "Can I withdraw?",
                "How do fees work?",
              ].map((q) => (
                <button disabled={busy} key={q} onClick={() => ask(q)}>
                  <CircleHelp size={12} />
                  {q}
                </button>
              ))}
            </div>
            <form
              className="chat-composer"
              onSubmit={(e) => {
                e.preventDefault();
                ask();
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing &&
                    !busy
                  ) {
                    e.preventDefault();
                    ask();
                  }
                }}
                placeholder={
                  busy
                    ? "You can draft your next question…"
                    : "Ask about investing or your scenario…"
                }
                aria-label="Ask your investment coach"
                maxLength={1200}
              />
              {busy ? (
                <Button
                  type="button"
                  size="icon"
                  onClick={(event) => {
                    event.preventDefault();
                    stopResponse();
                  }}
                  aria-label="Stop response"
                >
                  <Square size={17} fill="currentColor" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  <Send size={19} />
                </Button>
              )}
            </form>
            {chatError && (
              <p
                className={unavailable ? "chat-fallback" : "chat-notice"}
                role="status"
              >
                {chatError}
              </p>
            )}
            <p className="composer-note">
              Enter to send · Shift + Enter for a new line. Keep personal and
              bank details private.
            </p>
          </div>
        </section>
        <aside className="simulator-column">
          <Simulator monthlyControl={false} />
          <div className="coach-aside-note">
            <span className="icon-tile">
              <MessageCircle size={18} />
            </span>
            <p>
              Play with the numbers.
              <br />
              <strong>This is your “what if” space.</strong>
            </p>
            <ArrowDown size={18} />
          </div>
          <Disclosure />
        </aside>
      </div>
      <div className="coach-bottom-note">
        <Check size={14} /> Your progress stays with you, from this conversation
        to your demo plan.
        <Link to="/onboarding">
          Ready for the next step? <ArrowRight size={14} />
        </Link>
      </div>
      <div className="mobile-sim-summary">
        <div>
          <span>Illustrative value in {state.years} years</span>
          <strong>
            {money(mobileProjection.balance)} <small>lei</small>
          </strong>
        </div>
        <a href="#simulator-title">
          View simulation <ArrowDown size={15} />
        </a>
      </div>
    </main>
  );
}
