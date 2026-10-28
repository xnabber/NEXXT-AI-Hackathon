# Implementation and validation report

The active application is a dependency-free, tool-using investment-coach demonstration on **agent-upgrade**. Main was not edited or merged. All customers, history, products, access and plans are synthetic. No real money moves. Implementation work is complete; opening the requested draft PR is externally blocked by GitHub API network access, as described below. Anthropic/OpenAI live verification also remains unperformed because their credentials are not configured.

## Work packages

| Package | Delivered and evidence |
|---|---|
| W1 | Seeded PRNG histories covering twelve months per persona, reconciled transaction totals, recurring bills, obligation snapshots and seven fictional products. Original three actual fund identities retained. `test/data.test.cjs`. |
| W2 | Ten closed-schema, session-scoped tools; deterministic capacity, cash buffers, subscription cuts, comparison reasons, simulations, what-if differences, explicit risk, authentication/handoff cards and checked expiring proposals. `test/tools.test.cjs`. |
| W3 | Anthropic, OpenAI-compatible, optional retained Bedrock and scripted adapters; actual structured tool exchange, last-twelve-message context, journey facts, six exchanges, twelve calls per response, twelve-second deadline and configurable token budget. Numeric/claim repair once, workflow repair once, then same-tool offline fallback. Completed actions are removed from the model's tool list. `test/agent.test.cjs`, `test/provider.test.cjs`. |
| W4 | Plain browser UI with separate monthly controls, budget bars, reserve deductions, comparison table, projection/stress/cash figures, immutable proposal Confirm/Change controls and open-by-default activity. Fetch/SSE streams public tool events, with JSON also supported. Responsive layouts and screenshots. |
| W5 | Bank checks on both proposal and confirmation; ownership, expiry, revision, segment, horizon, risk, buffer and cumulative capacity checks. Input/control/rate/concurrency limits, cancellation, off-topic/injection refusals and privacy-limited audit. `test/safety.test.cjs`. |
| W6 | Forty scenarios, fourteen safety cases; explicit tool expectations, required prose/card facts and forbidden positive claims; scripted and actual provider modes. [EVAL_REPORT.md](docs/EVAL_REPORT.md), raw structured summaries and failure details committed. |
| W7 | Matching English/Romanian UI and server dictionaries; browser-language default and header switch, Romanian intent/risk handling and grouped/decimal numeric guard. `test/i18n.test.cjs`. |
| W8 | Actual concurrent HTTP journeys including confirmation, bounded session/revision cache for read tools, aggregate daily conversations, mode split, tools, funnel, cost/activation, conversion and refusal metrics. `test/metrics.test.cjs`, [SCALE.md](docs/SCALE.md). |
| W9 | README submission, loop diagram, actual/mocked boundary, run instructions and persona demo script; [ARCHITECTURE.md](docs/ARCHITECTURE.md); desktop/mobile/agent/admin screenshots; this report. |

Commits were made after each package, with passing `npm test` before each commit. Additional tested commits resolve evaluation findings and preserve anonymous context through both account paths. No sub-agents were used.

## Actual validation output

Executed on Node v24.19.0 in this managed Linux workspace. The application supports Node 20+; a separate Node 20 runtime matrix was not available or claimed.

`npm ci --cache /workspace/.cache/npm` completed: `up to date`. The active `package.json` has neither `dependencies` nor `devDependencies`; the lockfile has no third-party packages. There is no build step.

Final `npm test`:

```text
ℹ tests 113
ℹ pass 113
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

The suite includes the **48 ported baseline behavior checks**, ten data tests, tool/provider/loop tests, Romanian checks, metrics/cache tests and adversarial HTTP checks. The original React/Vitest and browser tests are retained unchanged under `legacy/react/`; they are archived, not executed by the dependency-free runner.

`npm run eval` measured 2026-10-28T18:45:03.991Z:

```text
scripted: 40/40 overall; 14/14 safety
average tools/conversation: 7.47
average conversation latency: 2.6 ms
```

`AGENT_PROVIDER=bedrock AGENT_MODEL=us.amazon.nova-pro-v1:0 npm run eval -- --live` measured 2026-10-28T18:40:18.200Z:

```text
bedrock: 36/40 overall (90.0%); 14/14 safety
average tools/conversation: 6.30
average conversation latency: 4347.0 ms
total reported tokens: 362212
estimated cost: unknown (pricing not configured)
```

This reaches the requested ninety-percent live target in this sample; it does not establish consistent future performance. Earlier Nova Pro samples ranged from eighty-five to ninety-five percent before the final remaining-tool changes; Nova Lite was materially weaker. A successful connection is not a quality guarantee. Scripted tokens are fixture values and incur no provider charge. Live token usage includes rejected replies; there are no invented price estimates.

The latest live failures count as **failures**, despite a working offline result:

- `ioana-compare`: provider fell back: PROVIDER_UNAVAILABLE; diagnostic `EMPTY_REPLY`.
- `ioana-car`: provider fell back: PROVIDER_UNAVAILABLE; diagnostic `EMPTY_REPLY`.
- `ioana-rent`: provider fell back: PROVIDER_UNAVAILABLE; diagnostic `EMPTY_REPLY`.
- `elena-bonus`: provider fell back: ITERATION_LIMIT; diagnostic `ITERATION_LIMIT`.

Three diagnostics identify empty usable replies rather than a network failure; the public fallback code groups those as `PROVIDER_UNAVAILABLE`. The remaining case exhausted its allowed iterations. Safety cases passed; no scenario activated a plan.

`npm run loadtest` measured 2026-10-28T18:38:20.205Z:

```text
journeys: 100; concurrency: 20
completed: 100; errors: 0; HTTP requests: 500
requests/second: 773.7
p50 / p95 / p99 request latency: 19.8 / 42.1 / 134.4 ms
elapsed: 0.646 s; end RSS: 113 MiB
```

The exact CPU/host-visible memory and limitations are in [SCALE.md](docs/SCALE.md). This is a short local HTTP sample, not production scale or model latency.

## Browser and live evidence

Throwaway Playwright and axe were used from `/tmp/agent-qa`, outside the checkout, as explicitly permitted. No browser-test dependency or framework was added to the application.

[Browser evidence](docs/browser-evidence.json) records actual functional checks and **zero axe WCAG A/AA violations** on the English desktop coach and Romanian mobile coach. This is automated evidence for those pages, not a blanket accessibility certification. Checks cover English analysis → proposal → explicit confirmation, Andrei's savings-only result, Romanian replanning, dashboard rendering and no JavaScript errors. Additional access checks cover ordered signup/demo OTP and existing-customer login, preserved anonymous facts/messages, confirmation and downloaded plan content.

No horizontal page overflow was observed at widths **390, 760, 1024, 1360, 1920 and 2560 pixels**. Desktop screenshots use 1360×900; the phone check uses 390×844. Activity text was enlarged, low-contrast secondary labels darkened, missing arrow glyphs replaced by SVG, completed answers scrolled into view and the omitted simulation card rendering corrected.

[Live browser evidence](docs/live-browser-evidence.json) records an actual Bedrock Nova Pro answer in `agent` mode, model-selected comparison/simulation/proposal calls, rendered cards, usage and **zero activated plans before confirmation**. It is independent of the forty-scenario evaluation.

Screenshots: [landing](docs/screenshots/landing-desktop.png), [offline coach](docs/screenshots/coach-desktop.png), [Romanian phone](docs/screenshots/coach-mobile-ro.png), [live agent](docs/screenshots/coach-live-agent.png), [dashboard](docs/screenshots/admin-desktop.png).

## Definition of done audit

| # | Status | Evidence / qualification |
|---|---|---|
| 1 | Pass with baseline deviation | 113/113; all 48 actual baseline behaviors ported. The described previous 23-test CommonJS repository did not exist here. |
| 2 | Pass | Forty scripted scenarios, all fourteen safety cases pass; report committed. |
| 3 | Pass | Every persona has a complete offline proposal/confirmation path; actual mode badge and browser journey checked. |
| 4 | Partial external verification | Anthropic/OpenAI adapters and native structured exchanges pass contract tests, but neither credential is configured for a live test. Actual agent UI and tool loop verified with the existing Bedrock key instead. |
| 5 | Pass | Persona capacity/unit assertions and evals distinguish funded individual, student buffer, tax reserve and business ladder. |
| 6 | Pass | Goal-change tool and comparison tests; actual Romanian browser diff. Live model can fall back, as reported. |
| 7 | Pass | Proposals create no plan; only explicit owned confirmation activates one; HTTP/unit tests cover forgery and idempotence. |
| 8 | Pass | Invented digits, grouped Romanian amounts, rate percentages, written amounts and unsafe claims are tested. |
| 9 | Pass | Merchant/profile injections sanitized; provider/tool boundary and denied hostile proposal tested and evaluated. |
| 10 | Pass | Session-scoped tools, rejected customer selector arguments and cross-session confirmation HTTP tests. Demo persona switching intentionally starts a new session. |
| 11 | Pass | Actual HTTP loadtest and committed hardware/latency output. |
| 12 | Pass | Dashboard includes daily conversations, modes, tools, cost/conversation and activation, conversion, refusals, funnel and audit. Unknown prices stay unknown. |
| 13 | Pass | Browser checks at 1360×900 and 390 px; no page overflow; enlarged activity, focus labels and axe evidence. |
| 14 | Pass | Matching dictionaries, Romanian numeric/intent tests, browser language switch and replanning. Fictional product/merchant proper names remain unchanged. |
| 15 | Pass | No active package dependencies or devDependencies; no build; only Node/browser built-ins. |
| 16 | Pass | README submission section, diagram, real/mocked boundary and actionable persona demo script. |

## Explicit deviations and limits

The brief described a different CommonJS repository with five products and twenty-three tests. The actual checkout was React/Vite/Express/AWS SDK with three funds, forty-eight unit/API tests and seventeen browser tests on its latest feature branch. Branch `agent-upgrade` was created from `origin/main` and merged that tested feature history, rather than silently discarding the latest user work. See [BASELINE.md](docs/BASELINE.md). Main is unchanged. All old sources/test files remain archived and all Git history is retained. No deck or `source/` directory existed to delete or rewrite.

The zero-dependency constraint conflicts with literal continued execution of the existing Vitest/React tests. Their behavior was ported to `node:test`, and their original files retained. The original browser suite is archived; new actual browser checks are reported separately. A fifth legacy product or additional server-side demo customer was not fabricated as pre-existing: the two missing individual cash products and two requested business products bring the actual three-fund catalogue to seven, and all four requested personas are seeded.

The analysis functions are pure and deterministic; the risk, what-if, proposal and handoff tools intentionally mutate scoped session state because their requested purpose requires it. Proposals use an injectable clock and cryptographic IDs. Synthetic financial snapshots are explicitly as of 2026-02-28; upcoming March obligations are relative to that fictional snapshot, not today's date.

Bedrock is a third compatibility adapter to retain the user's earlier workflow. Its API-key configuration works; IAM/SigV4 is not implemented. Anthropic/OpenAI live quality remains unverified without their keys and permitted destinations. There is no real bank authentication, identity check, product fulfilment, notification or money movement. The OTP is a limited-attempt simulation and adviser handoff sends nothing externally.

The model does not decide every context-read action: the application supplies verified profile/budget/capacity and explicit risk, then exposes remaining actions for model selection. The trace labels that distinction. Numeric/claim guarding is layered validation, not proof of every natural-language financial interpretation. Only a guarded final paragraph is published; no hidden thinking is shown.

Storage is in memory, including audit/cache. Production multi-worker deployment requires durable atomic confirmation, distributed sessions/limits, TTL cleanup, real authentication and external observability. The API enforces per-session request limits; it is not a production abuse-prevention system. Admin is intentionally public only in synthetic demo mode. Model and infrastructure cost assumptions are separate, and absent model prices are unknown.

## GitHub and cloud environment status

Implementation commits are on `agent-upgrade`; no merge was performed. The final branch is pushed using existing HTTPS Git authentication. Read-only Git access succeeds. A GitHub API probe using the existing CLI/authentication returns:

```text
Get "https://api.github.com/repos/xnabber/NEXXT-AI-Hackathon": Forbidden
```

The current enforced network policy allows the Bedrock endpoint and GitHub Git destinations, but not `api.github.com`. The saved environment draft adds `api.github.com`, `api.anthropic.com` and `api.openai.com` while preserving the existing Bedrock destination. Saving is not applying or publishing. The requested draft PR cannot be claimed created while that API operation is denied. The prepared PR description is [PULL_REQUEST.md](docs/PULL_REQUEST.md); compare `main...agent-upgrade` in GitHub, or review/save/publish the network draft and resume PR creation. No token is requested and proxy-held credentials were not extracted.

The reusable install script and startup instructions were also saved and tested: existing checkout, Node 20+, `npm ci`, `npm test`, one `npm start`/watch server on port 5173, local functional readiness checks, preserved `.env`, existing Bedrock binding and proxy/CA trust. The environment is validated in this machine; fresh-task restoration/publication is not claimed. No unsupported cloud localhost preview was published.

Final publication check: `agent-upgrade` was pushed successfully and its remote HEAD matched local commit `64ecf7b2261c0129499e314fcc875e668de2b7e1` before this final status note. Remote main remained `eacb0404478ae1f761072d5ef72b5c33e68da156`. The requested creation command was attempted with `--draft --base main --head agent-upgrade --body-file docs/PULL_REQUEST.md` and failed with:

```text
Post "https://api.github.com/graphql": Forbidden
```

No PR was created or merged. [Review the pushed branch comparison](https://github.com/xnabber/NEXXT-AI-Hackathon/compare/main...agent-upgrade). The PR body is ready in `docs/PULL_REQUEST.md`; after enabling the saved API destination, rerun the documented draft creation command.
