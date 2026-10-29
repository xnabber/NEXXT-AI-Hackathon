The investment coach now analyses synthetic customer history and completes financial planning work through scoped budget, product, planning and coordinator agents. Independent role prompts and tool transcripts share verified results under one global time/token/exchange budget. The activity panel shows real handoffs and tool ownership; offline mode uses the same deterministic tools and reports zero model calls. Only a separate, bank-checked user confirmation can activate a demo plan.

This branch also contains the earlier dependency-free CommonJS upgrade, four fictional personas, budgeting/product/simulation cards, English/Romanian access and plan flows, and aggregate audit/funnel metrics. Original React sources/tests are archived in `legacy/react`; 48 actual baseline behaviors were ported to `node:test`. All banking data, access, OTP and activation are synthetic. No real money moves.

Validation:

- 129/129 tests, including role/tool isolation, guarded handoffs, concurrent-customer scoping, cancellation and actual SSE.
- 40/40 scripted scenarios, including 14/14 safety cases.
- Latest live Bedrock Nova Pro: 39/40 (97.5%), 14/14 safety. The business cash-product-versus-ladder mismatch is recorded in `docs/EVAL_REPORT.md`.
- Actual offline HTTP loadtest: 100 journeys, 20 concurrent, zero errors; 799.3 requests/s and 41.5 ms p95 in a short loopback sample.
- English desktop/Romanian phone UI, explicit confirmation, Stop/draft retention, persona activity reset, live specialist calls and zero reported axe violations on the checked coach pages.

`REPORT.md`, `docs/ORCHESTRATION.md` and `docs/ARCHITECTURE.md` explain the trust boundaries and limitations. Anthropic/OpenAI have contract tests; live verification uses the existing Bedrock key. Costs are unknown without configured prices, state is in memory, and provider behavior varies. No runtime/dev dependencies or build step were added. `AGENT_ORCHESTRATION=0` preserves the prior single-agent path.

Please review as a draft. Do not merge.
