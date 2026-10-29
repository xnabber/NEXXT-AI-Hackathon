import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  CircleHelp,
  Landmark,
  LoaderCircle,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Sprout,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Disclosure } from "./components/Layout";
import { MonthlyControl, Simulator } from "./components/Simulator";
import { useJourney } from "./lib/journey";
import { guidedReply } from "./lib/guide";
import { demoAccount, money, pct, products, project } from "./lib/finance";
import type { Risk } from "./lib/finance";
import type { Message } from "./lib/journey";
const welcome =
  "Hi! I can explain how investing works. What would you like to know?";
const topics = [
  { label: "Risk and return", question: "How do risk and return work?" },
  { label: "Funds and ETFs", question: "What is a fund or an ETF?" },
  { label: "Fees", question: "How do fees work?" },
  { label: "Inflation", question: "What does inflation do to my savings?" },
  { label: "Withdrawing money", question: "Can I withdraw my money?" },
];
const questions = [
  "How much of that could go to investing each month?",
  "When might you want to use this money?",
  "How do you feel about the ups and downs?",
];
const newMessage = (
  role: Message["role"],
  text: string,
  source?: Message["source"],
  channel?: Message["channel"],
): Message => ({ id: crypto.randomUUID(), role, text, source, channel });
/* Browser coach: generic guidance, no account. In the app: same chat, own numbers. */
export default function Coach({ inApp = false }: { inApp?: boolean }) {
  const { state, update } = useJourney();
  const navigate = useNavigate();
  const channel = inApp ? ("app" as const) : undefined;
  const browserMessages = state.messages.filter((m) => m.channel !== "app");
  const appMessages = state.messages.filter((m) => m.channel === "app");
  const answered = state.messages.some((m) => m.role === "assistant");
  const product = products.find((p) => p.id === state.risk)!;
  const mobileProjection = project(
    state.monthly,
    state.years,
    product.grossReturn,
    product.fee,
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [live, setLive] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (state.messages.length)
      chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.messages.length, busy]);
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
        newMessage("user", answer, undefined, channel),
        newMessage("assistant", response, "guided", channel),
      ],
    }));
  async function ask(text = input) {
    if (!text.trim() || busy) return;
    const question = text.trim().slice(0, 1200);
    setInput("");
    setBusy(true);
    setChatError("");
    const messages = [
      ...state.messages,
      newMessage("user", question, undefined, channel),
    ].slice(-38);
    update({ messages });
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 25000);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages
            .slice(-12)
            .map((m) => ({ role: m.role, text: m.text })),
          context: {
            monthly: state.monthly,
            years: state.years,
            risk: state.risk,
          },
        }),
        signal: controller.current.signal,
      });
      if (!response.ok) throw new Error("Coach unavailable");
      const reply = await response.json();
      if (typeof reply.text !== "string" || !reply.text.trim())
        throw new Error("Empty reply");
      update((current) => ({
        messages: [
          ...current.messages,
          newMessage("assistant", reply.text, reply.source, channel),
        ].slice(-40),
      }));
      setLive(reply.source === "bedrock");
      setUnavailable(false);
    } catch {
      update((current) => ({
        messages: [
          ...current.messages,
          newMessage("assistant", guidedReply(question), "guided", channel),
        ].slice(-40),
      }));
      setUnavailable(true);
      setChatError(
        "The live coach is unavailable. Your question was answered by the educational guide.",
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  if (inApp && !state.authenticated)
    return <Navigate to="/onboarding" replace />;
  if (!inApp && state.authenticated)
    return <Navigate to="/account/coach" replace />;
  const renderMessage = (m: Message) => (
    <div key={m.id} className={`message ${m.role}`}>
      {m.role === "assistant" && (
        <span className="message-avatar">
          <Sprout size={14} />
        </span>
      )}
      <div className="message-bubble">
        {m.text}
        {m.source === "bedrock" && (
          <span className="message-source">
            <Sparkles size={10} /> AI response
          </span>
        )}
      </div>
    </div>
  );
  return (
    <main className="coach-page container">
      <div className="coach-page-top">
        {inApp ? (
          <span className="in-app-pill">
            <Smartphone size={14} /> Raiffeisen app · demo
          </span>
        ) : (
          <Link className="back-link" to="/">
            <ChevronLeft size={16} /> Back to the big picture
          </Link>
        )}
        <span className="educational-pill">
          <ShieldCheck size={13} />{" "}
          {inApp
            ? "Demo data · No money moves"
            : "No account needed · No commitment"}
        </span>
      </div>
      <div className="coach-heading">
        <div>
          <div className="eyebrow">
            <span />{" "}
            {inApp ? "PICKING UP WHERE YOU STOPPED" : "CHAT IN THE BROWSER"}
          </div>
          <h1>
            {inApp ? (
              <>Welcome, {state.name}. Let’s use your own numbers.</>
            ) : (
              <>
                Let’s make your money
                <br className="mobile-only" /> make sense.
              </>
            )}
          </h1>
          <p>
            {inApp
              ? "Same conversation, now with your account data. You decide every step."
              : "Ask anything about investing. Plain answers, no account needed."}
          </p>
        </div>
        <span className="coach-heading-decoration">
          <Sparkles size={30} strokeWidth={1.3} />
        </span>
      </div>
      <div className="coach-grid">
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
            {inApp && (
              <span className="chat-header-step">
                {state.question < 3 ? (
                  `0${state.question + 1} / 03`
                ) : (
                  <Check size={18} />
                )}
              </span>
            )}
          </div>
          <div className="chat-body">
            <div className="chat-welcome">
              <span className="message-avatar">
                <Sprout size={15} />
              </span>
              <div>
                <p>{welcome}</p>
                <span className="message-note">
                  General guidance for everyone. No account needed.
                </span>
              </div>
            </div>
            <div
              className="message-list"
              aria-live="polite"
              aria-relevant="additions"
            >
              {browserMessages.map(renderMessage)}
              {inApp && (
                <>
                  <div className="chat-divider" role="separator">
                    <Smartphone size={13} /> Now in the Raiffeisen app
                  </div>
                  <div className="message assistant">
                    <span className="message-avatar">
                      <Sprout size={14} />
                    </span>
                    <div className="message-bubble">
                      {browserMessages.length
                        ? `Welcome, ${state.name}! Your chat came with you, so we can pick up right where we stopped.`
                        : `Welcome, ${state.name}! We’re starting fresh here, as you chose not to save the browser chat.`}{" "}
                      I can now see your account (demo data), so let’s use your
                      own numbers.
                    </div>
                  </div>
                  <OwnData />
                  {appMessages.map(renderMessage)}
                </>
              )}
              {busy && (
                <div className="message assistant">
                  <span className="message-avatar">
                    <Sprout size={14} />
                  </span>
                  <div className="message-bubble typing" role="status">
                    <LoaderCircle size={15} className="spin" /> Thinking it
                    through…
                  </div>
                </div>
              )}
            </div>
            {!inApp &&
              (answered ? (
                <div className="handoff">
                  <div className="message assistant">
                    <span className="message-avatar">
                      <Sprout size={14} />
                    </span>
                    <div className="message-bubble">
                      Want to keep going? Download the Raiffeisen app and create
                      your account. It takes about 8 minutes.
                    </div>
                  </div>
                  <section
                    className="consent-card"
                    aria-labelledby="consent-title"
                  >
                    <span className="consent-label">CONSENT</span>
                    <h3 id="consent-title">Continue in the Raiffeisen app</h3>
                    <p>
                      Save this chat to your new profile so you can pick up
                      where you stopped.
                    </p>
                    <Button
                      className="full-width"
                      onClick={() => {
                        update({ chatConsent: true });
                        navigate("/onboarding");
                      }}
                    >
                      I agree, continue <ArrowRight size={18} />
                    </Button>
                    <button
                      className="text-button"
                      onClick={() => {
                        update({ chatConsent: false });
                        navigate("/onboarding");
                      }}
                    >
                      Continue without saving this chat
                    </button>
                  </section>
                </div>
              ) : (
                <p className="topic-hint">
                  Pick a topic below or ask your own question.
                </p>
              ))}
            {inApp &&
              (state.question < 3 ? (
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
                          `A thoughtful starting point. ${money(state.monthly)} lei a month adds up to ${money(state.monthly * 12)} lei in a year, before any returns.${state.monthly <= demoAccount.monthlyLeftover ? ` That fits within the ~${money(demoAccount.monthlyLeftover)} lei you usually have left at month-end.` : ` That is more than the ~${money(demoAccount.monthlyLeftover)} lei you usually have left at month-end, so make sure everyday needs stay covered.`} Keep your emergency savings in place first.`,
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
                    <Link to="/account/invest">
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
              ))}
            <div ref={chatEnd} />
          </div>
          <div className="chat-composer-area">
            <div className="quick-replies">
              {topics.map((t) => (
                <button
                  disabled={busy}
                  key={t.label}
                  onClick={() => ask(t.question)}
                >
                  <CircleHelp size={12} />
                  {t.label}
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
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="No question is too small…"
                aria-label="Ask your investment coach"
                maxLength={1200}
                disabled={busy}
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                aria-label="Send message"
              >
                {busy ? (
                  <LoaderCircle size={18} className="spin" />
                ) : (
                  <Send size={17} />
                )}
              </Button>
            </form>
            {unavailable && (
              <p className="chat-fallback" role="status">
                {chatError}
              </p>
            )}
            <p className="composer-note">
              For education, not personal advice. Please leave out personal or
              bank details.
            </p>
          </div>
        </section>
        <aside className="simulator-column">
          <Simulator />
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
      {!inApp && (
        <div className="coach-bottom-note">
          <Check size={14} /> One conversation, from this browser into the
          Raiffeisen app, only if you agree.
          <Link to="/onboarding">
            Ready for the next step? <ArrowRight size={14} />
          </Link>
        </div>
      )}
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
function OwnData() {
  return (
    <section className="own-data" aria-labelledby="own-data-title">
      <h3 id="own-data-title">
        <Landmark size={16} /> Your money at a glance
        <span>Demo data</span>
      </h3>
      <dl>
        <div>
          <dt>Current account</dt>
          <dd>
            {money(demoAccount.currentBalance)} <small>lei</small>
          </dd>
        </div>
        <div>
          <dt>Savings, earning {pct(demoAccount.savingsRate)}</dt>
          <dd>
            {money(demoAccount.savingsBalance)} <small>lei</small>
          </dd>
        </div>
        <div>
          <dt>Usually left at month-end</dt>
          <dd>
            ~{money(demoAccount.monthlyLeftover)} <small>lei</small>
          </dd>
        </div>
      </dl>
      <p>You can start investing from 100 lei a month.</p>
    </section>
  );
}
