# Scale and growth evidence

Measured 2026-10-28T18:19:22.448Z using actual loopback HTTP against an ephemeral Node server, not direct function calls. All four personas complete bootstrap → selection → offline tool analysis → proposal → explicit confirmation → refreshed account.

| Measure | Result |
|---|---:|
| Journeys / concurrency | 100 / 20 |
| Completed / errors | 100 / 0 |
| Requests | 500 |
| Throughput | 812.0 requests/s |
| Request latency p50 / p95 / p99 | 18.4 / 40.9 / 147.4 ms |
| Elapsed | 0.62 s |
| End RSS | 111 MiB |

Node v24.19.0; linux x64; INTEL(R) XEON(R) PLATINUM 8573C; 5 visible logical CPUs; 33.3 GiB host-visible memory. Container quotas and shared host contention may differ. This short single-process loopback sample excludes network transit, TLS, a database, cold starts and model latency. It establishes demo behavior under concurrency, not production capacity or an SLA.

Run `npm run loadtest`; optional `JOURNEYS=200 CONCURRENCY=40 npm run loadtest` (PowerShell: set environment variables separately).

## Scaling design and remaining limits

HTTP handlers access sessions, proposals, plans, cache and audit through MemoryStore. They share no per-request state, but the **deployment is stateful today**. A database-backed store with atomic proposal confirmation and a distributed session/rate limiter is required before adding workers. In-memory data resets on restart; audit retains at most roughly twenty thousand events, and dashboard metrics explicitly cover that window. Session/proposal maps need TTL cleanup and durable retention policies for sustained production traffic.

Read-only tools use a bounded cache of five hundred results for a minute, keyed by session, persona, scenario revision, tool and input. Mutations are never cached. Budget and suitability are still rechecked during confirmation. Provider turns cap iterations, tokens, duration and concurrent turns per session; provider-wide concurrency/rate-limit queues and retry/backpressure remain future work. Offline fallback protects the demonstration during outages.

The dashboard reports observed mode split, tools, refusal reasons, conversion and costs. Cost uses explicit configured input/output prices; unknown prices remain unknown. Cost per activation allocates all observed conversation cost, including abandoned journeys, over confirmed demo plans. No real acquisition, revenue, bank integration or growth uplift is claimed.
