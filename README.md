# Hackathon submission — AI Investment Coach

An educational agent for Raiffeisen NEXXT VibeHack, **AI for Scaling & Growth / Track 1**. It helps fictional individuals and a bakery business understand spending, protect essential cash, compare products and prepare a plan they explicitly confirm. It is an independent concept, not an official bank service.

The model can call validated tools to investigate a customer, compare options, simulate a plan and handle a changed goal. The budget, capacity and product decisions use actual deterministic calculations over seeded synthetic histories. A first-class offline planner uses the same tools when no provider is selected or inference fails. Every answer shows its actual `agent` or `offline` mode.

```mermaid
flowchart LR
  Q[Customer question + journey facts] --> A[Bounded agent loop]
  A <--> M[Anthropic / OpenAI-compatible / Bedrock]
  A <--> T[Profile · Budget · Capacity · Compare · What-if · Simulate · Propose]
  T --> C[Validated tool cards + public activity]
  A --> G[Numeric / claim guard]
  G --> C
  A --> F[Offline planner: same tools]
  C --> U[User reviews and confirms]
  U --> B[Separate bank-checked demo activation]
```

The application reads verified profile/budget/capacity context before the model acts. Model-selected comparisons, changes, simulations and proposals remain visible in the activity panel; the trace identifies which calls were application initiated. This is tool orchestration, not a claim that every step is chosen by the model.

**Real:** provider calls when configured, validated tools, calculations, immutable proposals, server-side checks, confirmation endpoint, audit, responsive UI and measurements. **Mocked:** all customers, transactions, products, account access, OTP, adviser handoff and activation. No real account is opened and no real money moves. Return and fee assumptions are illustrative, not forecasts. The model never receives a money-movement tool.

## Run in 60 seconds

Use Node **20+** and npm. There are no runtime/dev dependencies, framework or build step.

```sh
git switch agent-upgrade
npm ci
npm test
npm start
```

The single Node server serves both the UI and API on port **5173** (`PORT` changes it). On your own computer, open your browser at that port. `npm run dev` uses Node's watch mode. No database, Docker, Vite, separate frontend process or build command is needed. Data persists in the server's memory until restart; browser sessions use an HttpOnly cookie.

To configure a provider, copy `.env.example` to the ignored `.env` (`cp .env.example .env`; PowerShell: `Copy-Item .env.example .env`). Do not overwrite an existing file with credentials. Fill in values locally, keep secrets out of Git, then restart. Existing process environment values take precedence. Windows may hide filename extensions: the actual filename must be `.env`, not `.env.example` or `.env.txt`.

| Provider | Configuration |
|---|---|
| Offline (default) | `AGENT_PROVIDER=offline`; no key needed |
| Anthropic Messages | `AGENT_PROVIDER=anthropic`, `AGENT_ANTHROPIC_API_KEY`, optional `AGENT_MODEL` |
| OpenAI-compatible | `AGENT_PROVIDER=openai`, `AGENT_OPENAI_API_KEY`, `AGENT_OPENAI_BASE_URL`, `AGENT_MODEL` |
| Existing Bedrock API key | `AGENT_PROVIDER=bedrock`, `AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION=us-west-2`, `BEDROCK_MODEL_ID=us.amazon.nova-lite-v1:0` |

For stronger Bedrock tool use, the explicitly tested alternative is `AGENT_MODEL=us.amazon.nova-pro-v1:0`; model access and cost differ. Setting a model does not change the provider. The compatible base URL defaults to `https://api.openai.com/v1`; a local compatible endpoint can use a loopback HTTP URL. Keys and provider requests remain server-side. This prototype uses Bedrock bearer API keys; IAM/SigV4 roles are not implemented.

Run `npm run provider:test` (or `npm run bedrock:test`) for one short live request. A connection success establishes access, not agent quality. Configure `AGENT_INPUT_USD_PER_MILLION` and `AGENT_OUTPUT_USD_PER_MILLION` for explicit cost estimates; blanks mean **unknown**, not free. Other controls are documented in [.env.example](.env.example). Cloud credentials do not transfer to your computer.

Cloud network settings must allow the selected provider hostname (`api.anthropic.com`, `api.openai.com`, your compatible endpoint, or `bedrock-runtime.us-west-2.amazonaws.com`). A saved environment draft is not applied until reviewed, saved and published. Cloud onboarding does not provide a browser preview link; local HTTP checks and throwaway browser tests validate the app internally.

## Three-minute demo script

Use `/coach`; keep **Agent activity** open. The persona switcher starts a separate fictional session. The language switch supports English and Romanian and defaults to the browser language.

1. **0:00–0:55 — Ioana:** select Ioana. Send “I have some spare cash, what should I do?” Show budget, essential buffer, upcoming rent and idle cash. Answer the risk question with “I want a balanced plan”. Review comparison, projection and checked proposal. No plan is activated yet.
2. **0:55–1:25 — Change of mind:** send “I need the money for a car in 2 years”. Show the before/after change card and funds excluded by the shorter horizon. Review the new liquid-savings proposal; tick the risk/demo acknowledgment and press **Confirm demo plan**. The success page explicitly says no real money moved.
3. **1:25–1:55 — Andrei:** select Andrei; ask “Can I afford to invest?” Show the unfunded buffer, specific subscriptions, first savings milestone and the small savings habit. No fund is offered.
4. **1:55–2:20 — Mihai:** select Mihai; ask about irregular income and the tax bill. Show the tax reserve and larger buffer. Answer “I prefer a steady plan” to see a small fund allocation while reserves stay liquid.
5. **2:20–2:45 — Elena:** select Elena; send “Make a plan for our bakery surplus”. Show operating/payroll reserves and staggered business deposit maturities.
6. **2:45–3:00 — Evidence:** switch to RO to show translated controls; open `/admin` for funnel, mode split, tool usage, costs and confirmation conversion. State whether the current answer is agent or offline and which provider is configured.

The offline version runs the whole script without a key. Live models may fall back safely; the mode badge reports that truthfully. The recorded Nova Pro run passed 36/40 scenarios (90%), including 14/14 safety cases; three replies had no usable final text and one replanning case reached the iteration limit. Anthropic and OpenAI live quality is not established without their credentials.

## Validation and measured evidence

```sh
npm test
npm run eval
npm run eval -- --live
npm run loadtest
```

- [Evaluation report](docs/EVAL_REPORT.md): forty scenarios, including fourteen safety scenarios; scripted baseline **40/40 overall and 14/14 safety**. Live Bedrock Nova Pro: **36/40 (90%) overall, 14/14 safety**, averaging about **4.35 seconds per conversation**. Exact failures, tools, latency and unpriced cost are reported separately. A fallback is a live quality failure.
- [Scale report](docs/SCALE.md): actual HTTP, one hundred complete journeys, twenty concurrent, zero errors; approximately **774 requests/s**, **42 ms p95** in the recorded short loopback run. This excludes model/network/database latency and is not production capacity.
- [REPORT.md](REPORT.md): work package evidence, checklist, real output, browser/accessibility checks and deviations.
- [Architecture](docs/ARCHITECTURE.md): trust boundaries, capacity assumptions, failure handling and storage/scale limits.
- [Baseline differences](docs/BASELINE.md): the supplied brief described another repository. The actual baseline's React/Vitest tests and sources are archived in `legacy/react/`; their behavior is ported to dependency-free Node tests. The nonexistent “previous 23 tests” and five products are not claimed to have existed.

## Interface and API

Monthly controls are separate from chat. Draft a question while an answer is pending; Stop cancels the pending request. SSE streams public tool actions, then the guarded final paragraph; it does not stream hidden reasoning or unchecked prose. Cards render tool payloads, including category bars, reserve deductions, comparison reasons, cash/stress projections and proposal confirmation. Labels use synthetic-data disclosures throughout.

| Route | Purpose |
|---|---|
| `/`, `/coach` | Landing, anonymous educational guide, persona analysis and tool cards |
| `/onboarding`, `/onboarding/new-account`, `/onboarding/login` | Ordered fictional access flow, limited demo OTP and preserved explicit choices |
| `/account/invest`, `/account/plan`, `/account/success` | Comparison, review, explicit demo confirmation and downloadable plan |
| `/admin` | Aggregate synthetic funnel and agent metrics, privacy-limited audit |
| `POST /api/agent` | `{message}` → `{messages,cards,trace,mode,usage}`; JSON or fetch/SSE |
| `POST /api/coach`, `/api/chat` | Compatibility aliases retaining `text` and `source` |
| `POST /api/proposals/:id/confirm` | Only activation endpoint; immutable owned proposal and `{confirm:true}` required |
| `GET /api/health` | Configuration readiness; not proof of model access |

Session-scoped tools cannot choose another customer. The bank checks suitability and capacity on proposal and confirmation, including existing allocations, scenario revisions and expiry. Input/rate/token/time limits and an answer guard provide layered controls. Unknown figures are retried once, then replaced by the offline tool-backed explanation. Logs exclude messages, customer names and tool arguments. In demo mode the dashboard is public; outside demo mode it requires `ADMIN_TOKEN`. This is a synthetic prototype, not production banking software.

![Coach with separate controls and tool activity](docs/screenshots/coach-desktop.png)
