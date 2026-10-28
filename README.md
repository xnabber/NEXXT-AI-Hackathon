# Raiffeisen AI Investment Coach

A responsive, functional concept prototype that takes a visitor from an anonymous educational conversation to a simulated monthly investment plan. It is an independent concept, not an official Raiffeisen service. All funds, customer access, and transactions are fictional.

## Run

Requires **Node.js 24+** and npm. No database or Supabase project is required.

```sh
npm ci
npm run dev
```

The development command starts Vite on port **5173** and the server API on port **3001**. Vite forwards `/api` to the backend. Keep both processes running. Stop them before reinstalling dependencies, then restart them to refresh module caches. In this cloud workspace, use `npm ci --cache /workspace/.cache/npm` to keep the npm cache writable.

For a production build and a single-server workflow:

```sh
npm run build
npm start
```

The production server serves both the built app and API on port **3001** (or `PORT`). These commands build and start the prototype; they do not publish or deploy it.

## Amazon Bedrock

The server supports a Bedrock API key through the environment. The browser never receives the key. Cloud environment secrets do **not** transfer to a GitHub clone on your computer.

### Test on your computer

1. Pull the latest `codex/ai-investment-coach` branch and use Node.js 24+. After an update, stop the running app, run `npm ci` to install the lockfile dependencies, then restart it.
2. Copy `.env.example` to `.env` in the project root (macOS/Linux: `cp .env.example .env`; PowerShell: `Copy-Item .env.example .env`).
3. Edit `.env` locally and fill in `AWS_BEARER_TOKEN_BEDROCK` with your actual **Bedrock API key**. An AWS access-key ID, secret-access key, or cloud proxy placeholder is not a Bedrock bearer API key. Do not paste the key into chat or commit it.
4. Keep `AWS_REGION=us-west-2` and `BEDROCK_MODEL_ID=us.amazon.nova-lite-v1:0`, or choose a Converse-compatible model/profile your key can access.
5. Run `npm run bedrock:test`. It sends one short paid request and reports success or a safe diagnostic without printing the key. It does not require the app to be running.
6. Start or restart `npm run dev` and use the chat on frontend port **5173**. This command starts both the frontend and API; running Vite alone does not start the API. Stop and restart after changing `.env`.

`npm run dev`, `npm start`, and `npm run bedrock:test` automatically load `.env`. Existing process environment variables take precedence, so check for stale exported settings if edits appear to have no effect.

Use the following server-side configuration locally or in cloud environment settings:

| Variable                   | Purpose                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AWS_BEARER_TOKEN_BEDROCK` | Secret Bedrock API key; enter it in your local ignored `.env` or use the cloud secret binding.                                                    |
| `AWS_REGION`               | Defaults to `us-west-2`.                                                                                                                          |
| `BEDROCK_MODEL_ID`         | Defaults to `us.amazon.nova-lite-v1:0`, an inference profile used with the Converse API. Choose an accessible compatible model/profile if needed. |
| `PORT`                     | Optional backend port, default `3001`. For development, keep 3001 unless you also update the Vite proxy.                                          |

The configured secret and network policy must permit **`bedrock-runtime.us-west-2.amazonaws.com`**. Changing region also requires updating the endpoint permission and secret destination in environment settings. The npm commands load the local `.env` file, while preserving any existing environment variables.

The official AWS JavaScript SDK sends authenticated Converse and ConverseStream requests from the server. It retains the inherited HTTPS proxy and uses `AWS_CA_BUNDLE`, `SSL_CERT_FILE`, or `REQUESTS_CA_BUNDLE` to trust the managed environment CA. TLS verification remains enabled.

`GET /api/health` (on API port 3001, or through the frontend proxy) reports `guided-demo` without a key and `bedrock-configured` when one is present; it does not prove live model access. `POST /api/coach` validates conversation/context and invokes Bedrock server-side. Clients requesting `Accept: application/x-ndjson` receive `start`, incremental `delta`, and `done` events; mid-stream failures emit a safe `error` event. If a model or key permits normal inference but rejects streaming before any text arrives, the server falls back to a normal live reply. Streaming generally needs `bedrock:InvokeModelWithResponseStream` permission, while normal inference uses `bedrock:InvokeModel`. The JSON response remains available for non-streaming clients. Disconnecting or pressing Stop aborts the provider request. With no key, it provides a labeled deterministic educational guide. If a configured live request fails or times out, the frontend explains that it is using the guide. The API and server terminal report safe diagnostics for rejected keys (401), denied access (403), model/request problems (400/404), rate limits (429), timeouts, and certificate failures. No raw upstream error messages, conversation content, or credential values are logged by the server.

A live educational question was successfully answered using the configured `us-west-2` Bedrock endpoint and default Nova Lite inference profile during implementation. Live responses can still depend on key expiry, model permissions, service availability, and quotas.

## Responsive layout and chat

Typography scales with the viewport while keeping normal chat text around 16–18px. Content expands on large monitors instead of remaining in a fixed 1,200px column. The coach uses three separate panels on wide displays, two columns with compact scenario controls on laptops, and a stacked layout with section shortcuts on smaller screens. Controls remain separate from chat, and the mobile projection summary stays visible.

Bedrock replies stream as text arrives. You can draft your next question while the coach answers, stop a reply without losing that draft, and use Enter to send or Shift+Enter for a new line. Messages and setup answers remain saved, but setup confirmations are excluded from the live conversation context to avoid repetitive replies. The model receives the simulator's calculated contribution, growth, fee, and purchasing-power figures and is instructed to use them only when relevant to the user's question. The offline educational guide also uses the current scenario and recognizes basic follow-up questions.

## The journey

| Route                     | Experience                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/`                       | Campaign landing, interactive inflation illustration, questions, four-stage overview.                      |
| `/coach`                  | Three questions, free-text educational chat, quick replies, live contribution/horizon controls and charts. |
| `/onboarding`             | New-customer or existing-customer demo choice.                                                             |
| `/onboarding/new-account` | Two-step illustrated profile flow; no real identity verification.                                          |
| `/onboarding/login`       | Demo customer access; no password or bank login collected.                                                 |
| `/account/invest`         | Fictional funds with allocation, illustrative fees, risk, liquidity details, and horizon requirements.     |
| `/account/plan`           | Review, illustrative contribution day, and explicit risk/demo acknowledgment.                              |
| `/account/success`        | Simulated confirmation, downloadable plan, and educational next steps.                                     |

The shared journey, conversation, and demo display name are saved in browser `localStorage`. They survive refresh and route changes, but do not sync across devices. Storage failures fall back to memory with a visible notice. **Reset demo** clears the saved journey. Changing an activated scenario requires reviewing and activating a new demo plan. Funds are examples, not suitability recommendations.

Do not enter real banking credentials, identity documents, or sensitive personal information. When the live coach is available, free-text questions and simulation context are sent to Bedrock. A real banking service would require actual authentication, identity checks, suitability assessment, product documents, and a separately designed backend; none is claimed here.

## Financial model

`src/lib/finance.ts` keeps calculations separate from the UI.

- Inflation: purchasing power = initial amount / `(1 + inflation)^years`. The reference example is 10,000 lei / `1.055^5` ≈ **7,651 lei**.
- Contributions happen at the **end of each month**.
- Annual fees are approximated as a reduction in assumed annual return. The equivalent monthly rate is `(1 + gross annual return − annual fee)^(1/12) − 1`.
- The chart shows contributions, the illustrative value after fees, and an optional view in today's purchasing power.
- Example returns are constant assumptions, not forecasts. A losing-market example and an alternative stronger-return example illustrate sensitivity; they are not bounds.
- Taxes, transaction charges, and other costs are excluded. Investment capital and returns are not guaranteed.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Unit/API tests cover the financial model, malformed saved state, request validation, the guide, and provider failures. Browser tests run the full journey at desktop/mobile sizes, including both account paths, saved progress, risk acknowledgment, downloads, fund eligibility, chat fallback, streaming and cancellation, route guards, and automated WCAG accessibility checks. A viewport matrix checks widths from 360px through 2560px. Browser provider responses are mocked for repeatability; live Bedrock was verified separately.

Playwright uses system Chromium at `/usr/bin/chromium` in the cloud environment. Set `CHROMIUM_PATH` for another local installation. Browser tests can start the development server or reuse an existing one. Test reports and build outputs are ignored by Git.

## Structure and design

React + TypeScript, Vite, Tailwind CSS, shadcn-style Radix primitives, Lucide, Recharts, and React Router. Fonts are bundled locally. The Node/Express API is separate from browser code. Routes are loaded on demand so the landing page does not load the chart bundle.

Reusable primitives are in `src/components/ui`, shared financial logic/state in `src/lib`, route components in `src`, and the API in `server`. Yellow, neutral surfaces, a placeholder arrow mark, and clear typography provide the Raiffeisen-inspired concept treatment without using official brand assets.

The supplied pasted brief ended during the monthly-slider section, and the referenced overview PDF was not attached. The implementation follows its stated end-to-end journey and general requirements, with illustrative defaults for the unspecified questions, funds, and account screens. Persistence and authentication use local demo state; optional Supabase integration is not configured.
