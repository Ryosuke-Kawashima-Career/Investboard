---
document_type: "implementation_plan"
version: "1.5.0"
target_spec_version: "1.5.0"
status: "In Progress"
last_updated: "2026-10-31"
author: "Codex"
---

# Indian equity research implementation plan

Delivery order: Front UI/UX implementation -> Minimum workable backend implementation -> Feedback and improvement by the user. Deliver a complete fixture-backed interface first, connect the smallest backend that makes the core research journey work, then improve the working product from actual user feedback.

Specification: [Indian equity research MVP](../specs/spec_indian_equity_research.md), version 1.5.0. Phase 1 is implemented and verified with synthetic fixtures; Phase 2 is implemented and verified against real Yahoo Finance and Google News data (2026-10-31); Phase 3 is in progress: TASK-10 (price-change readability) is planned and TASK-08 is the feedback loop. See [frontend contracts and verification record](../contracts/frontend_contracts.md).

## Execution and verification conventions

The frontend baseline is React 19, TypeScript and Vite 6, with Playwright browser journeys and Vitest fixture-contract tests. Run `npm ci` and `npm run dev` to review the app. The server API, hosting, ingestion and providers remain Phase 2 decisions. Current runnable verification is `npm run build`, `npm run test:unit` and `npm run test:e2e`; integration configuration exists but has no tests until Phase 2. Performance checks and backend-specific test files listed below are pending and are not passing claims.

Use `npm run test:unit -- <file>` for unit tests, `npm run test:integration -- <file>` for adapter/API tests, and `npm run test:e2e -- <file>` for browser journeys. External services must be replaced by deterministic recorded or synthetic fixtures in CI; keep any permitted provider smoke tests separate.

## Ordered work

### Phase 1: Front UI/UX implementation

- [x] TASK-01 — Choose the frontend framework, establish the build and browser-test scripts, and define fixture contracts for company identity, listing, quote, history, evidence, and discovery signals. Record provisional API contracts; provider selection and backend infrastructure must not block the UI. Covers REQ-01–REQ-05, REQ-08–REQ-10. Verification: `npm run build`; review fixture contracts against the specification's data contracts. Exit: frontend development can proceed entirely with clearly labeled synthetic data and no provider credentials.
- [x] TASK-02 — Build responsive search, quote display, company details, history, discovery filters and explanations, evidence links, and watchlist navigation. Include demo badges, timestamps, risks, keyboard access, price-direction text, and loading/empty/error/partial-data states. Covers REQ-01–REQ-05, REQ-07–REQ-09. Verification: `npm run test:e2e -- research-shell.spec.ts`. Review at 360px and desktop. Exit: the complete intended research journey is usable with fixtures.
- [x] TASK-06 — Implement add/remove/reset watchlist using versioned local storage. Restore on reload and handle storage denial or corrupted values. Covers REQ-06, REQ-10. Verification: `npm run test:e2e -- watchlist.spec.ts`. Exit: distinct exchange listings persist correctly and the user can clear all entries.

Verification on 2026-10-31: production build passed; five unit contract checks passed; `npm run test:e2e -- --workers=4` passed all twelve checks across 1440px desktop and 360px mobile. Discovery and company-detail screenshots were reviewed at both widths with no horizontal overflow. Search, filters, signal explanation, evidence destinations, history, loading/error/partial states and watchlist storage failure/reload/reset flows were exercised. Evidence notes remain visibly fictional and links lead to company disclosures, not sources supporting synthetic claims. Full accessibility and performance audits remain TASK-07.

- [x] TASK-09 — Add synthetic OHLC history and an inspectable candlestick/line chart on company pages, with daily/weekly/monthly aggregation, INR price scale, rise/fall legend and keyboard/pointer inspection. Covers REQ-03 and REQ-07. Verification: `npm run test:unit -- chart-data.test.ts`, `npm run test:e2e -- stock-chart.spec.ts`, and `npm run build`. Exit achieved: both chart modes and all periods work at desktop and 360px with no fabricated real-market OHLC. Verification: all 14 browser journeys passed before the final sizing/fixture refinement; the two affected chart journeys passed again afterward. All 10 unit checks and production build pass. Desktop/mobile screenshots were reviewed without horizontal overflow; mobile labels use a responsive SVG coordinate system. Synthetic history endpoints match displayed quote and previous close.

Phase exit achieved: a runnable UI/UX demonstration supports searching, inspecting a company, understanding a discovery signal, opening evidence, and saving a listing. Backend work begins after this frontend milestone. Formal user feedback and improvement occur in Phase 3.

### Phase 2: Minimum workable backend implementation

Before TASK-03 and TASK-04, record the smallest supported company universe and permitted market/content sources, costs, quotas, delivery modes, freshness thresholds, historical adjustment basis, hosting, and refresh approach. Select a precise versioned discovery definition and missing-data policy. These decisions complete TASK-01's provisional contracts without changing its frontend-first order.

- [x] TASK-03 — Implement a thin server API and one market-data adapter for company search, quote, profile, and history. Validate payloads and inputs; keep credentials server-side. Add bounded requests, basic caching, retry/backoff, and a provider-permitted refresh mechanism. Handle exchange collisions, zero previous close, gaps, market closures, stale data, and outages. Connect the Phase 1 UI to real supported data. Covers REQ-01–REQ-03, REQ-09, REQ-10. Verification: `npm run test:unit -- market-data.test.ts` and `npm run test:integration -- market-api.test.ts`. Exit: a supported company can be searched and inspected end to end with truthful prices, sources, and timestamps.
- [x] TASK-04 — Connect one approved web-evidence source. Implement company matching, URL canonicalization, deduplication, publication/retrieval timestamps, and short factual summaries with evidence links, contrary evidence, and abstention. Start with deterministic extraction; a generative model is optional. Restrict fetched sources and escape external text. Covers REQ-05, REQ-08–REQ-10. Verification: `npm run test:integration -- evidence-pipeline.test.ts`. Include unrelated similarly named companies, duplicate stories, missing dates, conflicting reports, blocked sources, and instruction-bearing content. Exit: the UI shows genuine company-linked evidence with no unsupported summary claims.
- [x] TASK-05 — Implement sector filtering and the smallest useful set of versioned discovery signals supported by the chosen data. Expose computation, period, sources, missing values, risks, and limitations. Covers REQ-04, REQ-05, REQ-08. Verification: `npm run test:unit -- discovery.test.ts` and `npm run test:e2e -- discovery.spec.ts`. Include tied values, missing fundamentals, stale evidence, and empty filters. Exit: discovery results are reproducible and explainable.
- [x] TASK-07 — Verify minimum backend reliability and protection before the user trial: input validation, secret handling, content escaping, fetch allowlists, quotas, safe logs, and labeled cached/unavailable behavior during outages. Check frontend accessibility and cached-view performance under a documented mobile profile. Covers REQ-07, REQ-09, REQ-10. Verification: `npm run test:integration -- service-resilience.test.ts`, `npm run test:e2e -- accessibility.spec.ts`, and `npm run test:performance`. Exit: no credentials or watchlists appear in logs; core views remain usable during provider failures and meet the specified 3-second cached-view target.

Verification on 2026-10-31 (spec 1.4.0): `npm run build` passed; `npm run test:unit` 24 passed; `npm run test:integration` 18 passed; `npm run test:e2e -- --workers=4` 26 passed; `npm run test:provider` acquired 248 sessions for each of 10 listings and 198 deduplicated headlines; `npm run test:performance` 2517–2810 ms (target 3000, thin margin); `scripts/trial.mjs` passed with 0 upstream calls. TASK-04 abstains from summaries and does not classify reporting vs opinion or positive vs negative, as spec 1.4.0 allows; headlines are labeled accordingly. See [verification record](../verification/phase2_real_data.md).

Phase exit achieved: the user can complete the core research journey with real supported data and the local watchlist. Keep deployment simple; multiple providers, distributed infrastructure, and optional AI must not delay this milestone. Required data permissions, attribution, freshness, and basic protections remain part of the minimum implementation. A controlled user trial is distinct from public launch.

### Phase 3: Feedback and improvement by the user

- [ ] TASK-08 — Give the user the working product and guide a review of finding a company, identifying price freshness, explaining a discovery signal, opening its evidence, and saving it. Record feedback as concrete observations, expected behavior, priority, and acceptance criteria. Address blockers first, then usability and research-quality improvements. For each iteration, update affected specification requirements and plan tasks before implementation, make the change, verify the affected journey, and return it to the user for another review. Covers REQ-01–REQ-10. Verification: record the review results and run `npm run test:e2e -- research-feedback.spec.ts` for changed critical journeys; run affected unit/integration checks. Exit: agreed feedback is resolved or explicitly deferred with the user, and the user can complete the research journey.

- [ ] TASK-10 — Make price changes easy to grasp on top of the TASK-09 chart. Increments, each reviewed by the user before the next: (1) pure `summarizePeriod(points)` in `src/chart-data.ts` plus a text summary above the chart (change since period start, direction word and arrow, period high/low with dates, session count; Unavailable under two sessions); (2) cursor readout shows change from period start; (3) period high/low markers, and 1Y defaults to Line; (4) real-data discovery sparkline from observed 1M closes via the existing history route, labeled observed, none when history is missing. Volume bars (needs `volume` stored and served by `server/store.ts`/`server/api.ts`) are optional and only on user request. No new chart library, indicators or Yahoo requests beyond the current budget. Covers REQ-03 and REQ-07. Verification: write failing tests first (`npm run test:unit -- chart-data.test.ts`, extended `stock-chart.spec.ts`, `real-data-research.spec.ts`), then `npm run build`, `npm run test:e2e`, `npm run test:performance` (stay under 3000 ms; margin is thin), and desktop/mobile screenshot review. Exit: a user can state a stock's change over 1M/6M/1Y from the page without hovering, and missing data is never shown as zero change.

Verification on 2026-10-31 (increments 1–4 implemented together at the user's request; awaiting user review, so not marked complete): `npm run build` passed; `npm run test:unit` 27 passed (3 new `summarizePeriod` checks written first and seen failing); `npm run test:integration` 18 passed; `npm run test:e2e -- --workers=4` 32 passed (new: period summary/markers/cursor delta in demo, observed sparkline and 1Y Line default in real mode, Unavailable under two sessions). Real-data review at desktop and 375px: summary, markers, sparkline caption and 1Y line render without overflow; an effect-driven 1Y default flashed one Candles frame and was replaced by render-time derivation. `npm run test:performance` was noisy on the shared machine: ten post-change runs 2211–4058 ms (median ≈2700, three above 3000) vs four baseline runs 2550–2801 ms; no regression is distinguishable from noise, but the margin remains thin. Volume bars not implemented (optional, on request).

Before public launch, TASK-08 also audits data permissions, source attribution, universe disclosure, fixture separation, and research wording; records qualified review of applicable regulatory obligations; and verifies all specification acceptance criteria. Final commands: `npm run build`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:performance`, and `python .codex/skills/spec-plan-sync/scripts/verify_spec_plan_sync.py`. Public launch is not a prerequisite for collecting feedback on the working MVP.

Dependencies: Phase 1 executes TASK-01 -> TASK-02 -> TASK-06. Phase 2 follows the Phase 1 exit and executes provider decisions -> TASK-03 -> TASK-04 -> TASK-05 -> TASK-07. Phase 3 follows the Phase 2 exit and executes TASK-08 as a repeatable user-feedback loop. Task IDs are preserved for traceability; execution follows phase order rather than numeric order. Do not mark a task complete until its verification and exit criteria pass.

## Requirement traceability

| Requirement | Implementation tasks | Main verification evidence |
|---|---|---|
| REQ-01 | TASK-01, TASK-02, TASK-03, TASK-08 | Search, universe disclosure, exchange collision tests |
| REQ-02 | TASK-01, TASK-02, TASK-03, TASK-08 | Quote calculations, timestamp and stale/outage tests |
| REQ-03 | TASK-01, TASK-02, TASK-03, TASK-08, TASK-09, TASK-10 | Profile/history contracts and missing-data tests |
| REQ-04 | TASK-01, TASK-02, TASK-05, TASK-08 | Deterministic discovery and explanation tests |
| REQ-05 | TASK-01, TASK-02, TASK-04, TASK-05, TASK-08 | Attribution, deduplication and claim-evidence tests |
| REQ-06 | TASK-06, TASK-08 | Watchlist persistence, reset and storage-failure tests |
| REQ-07 | TASK-02, TASK-07, TASK-08, TASK-09, TASK-10 | Responsive, keyboard, accessibility and performance checks |
| REQ-08 | TASK-01, TASK-02, TASK-04, TASK-05, TASK-08 | Risk wording, contrary evidence, permissions and launch review |
| REQ-09 | TASK-01, TASK-02, TASK-03, TASK-04, TASK-07, TASK-08 | Adapter validation, quota, cache, failure and fixture checks |
| REQ-10 | TASK-01, TASK-03, TASK-04, TASK-06, TASK-07, TASK-08 | Secret/input/content protection, reset and log checks |

## Risks and scope management

Data permissions, coverage, and cost may constrain the initial universe or update rate; adjust scope explicitly in the specification rather than implying unavailable coverage. Sparse or conflicting evidence must produce uncertainty or no signal. Do not replace missing fundamentals with invented values. Production launch remains dependent on permitted data access and qualified regulatory review; fixture-based development can proceed while these are unresolved.

During Phase 3 user-feedback iterations, revise scope and acceptance criteria in the specification first, update dependent tasks and this matrix, increment matching document versions, and rerun synchronization validation. Additional languages, accounts, brokerage, and personalized advice require separately specified work.

## Revision history

| Version | Date | Change | Trigger | Status |
|---|---|---|---|---|
| 1.0.0 | 2026-10-31 | Initial phased tasks, verification contracts, and traceability | Specification 1.0.0 | Draft |
| 1.0.1 | 2026-10-31 | Reordered delivery into frontend UI/UX, minimum workable backend, and user feedback/improvement; preserved requirement coverage | User delivery-order request | Draft |
| 1.0.2 | 2026-10-31 | Completed TASK-01, TASK-02 and TASK-06; recorded framework, fixture/API contracts, passing checks and frontend review artifacts | Initial frontend creation | In Progress |
| 1.1.0 | 2026-10-31 | Added TASK-09 for inspectable candlestick history | User chart request | In Progress |

| 1.2.0–1.2.1 | 2026-10-31 | Historical Alpha Vantage backend attempt: identity succeeded, daily prices unavailable; tracked integration subsequently reverted by user to ff1b55f; untracked artifacts survived | Preserved attempt history | Superseded |
| 1.3.0 | 2026-10-31 | Reopen Phase 2 after user revert; select Yahoo chart observations for verified NSE RELIANCE; preserve all research requirements | User alternative-source request | In Progress |
| 1.4.0 | 2026-10-31 | Phase 2 MVP backend: ten-listing NSE universe, Google News RSS evidence, price-momentum and news-coverage signals | User Phase 2 request | In Progress |
| 1.5.0 | 2026-10-31 | Added TASK-10 for price-change readability (period summary, cursor delta, high/low markers, observed sparklines) | User chart-readability request, specification 1.5.0 | In Progress |

## Replacement backend contract · 1.3.0

The user reverted tracked integration to ff1b55f (frontend baseline). No further git revert is necessary. Recoverable previous artifacts are archived in ignored `.local/checkpoints/alpha-before-yahoo.zip`. The earlier market-source choice is superseded, not the backend requirements. Phase 2 tasks remain open until replacement verification passes.

Use Node 24/TypeScript with SQLite, one source-isolated Yahoo database, a local read-only API and existing browser watchlist. Source: Yahoo Finance public chart endpoint, the same underlying service used by yfinance; direct Node integration avoids a Python runtime. Universe: NSE:RELIANCE / RELIANCE.NS / INR / NSI, verified against response metadata and official company filing. BSE is not active: the probe supplied only one observation. Do not relabel NSE data as BSE.

Require at least 22 genuine daily sessions. Use Yahoo quote OHLC arrays without dividend-adjusting, repairing or interpolating; label provider-supplied prices as split-adjusted by Yahoo, not raw unadjusted exchange ticks. Ignore adjclose arrays. Validate company/symbol/exchange/currency/timezone, array lengths, timestamps, nulls and OHLC invariants. Exclude the current India date conservatively so an unfinished daily candle is never called EOD. Retain supplied historical special sessions and declare missing-session coverage unknown without an exchange calendar.

Derive latest and previous close from the same series. Calendar ranges 1M/6M/1Y, genuine OHLC or explicit close-only line fallback, nullable fundamentals, date-only source precision, separate retrieval/refresh/cache status. Freshness unknown without a calendar, stale beyond seven calendar days. No fixture fallback in real mode; explicit demo stays separate, unsupported saved IDs removable.

Yahoo is an unofficial best-effort internet source, not an exchange-licensed service or guaranteed entitlement. Local personal research only; no public redistribution claim, purchase or deployment. Fixed HTTPS host/path, public DNS addresses only, redirects disabled, 10-second timeout, at most one transient retry, persisted 20-request rolling-day ceiling and Retry-After/429 cooldown. Startup if empty, then weekday 19:00 Asia/Kolkata and budgeted operator refresh. No browser-action upstream calls.

Reuse operator-verified original company evidence with exact URL, supported summary, nullable publication and actual retrieval. recent-disclosure-v1 uses the inclusive 30-day publication window in Asia/Kolkata; unknown dates and missing contrary evidence remain disclosed. Actual-source browser journey, restart/outage checks, deterministic offline CI, mobile 3-second performance target and source register are required before Phase 2 completion.

Verification: `npm run build`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e -- --workers=4`, `npm run test:performance`, `npm run test:provider` (one actual acquisition), and `node --env-file-if-exists=.env scripts/trial.mjs` (reuse acquired data).

## MVP backend scope · 1.4.0

Universe: ten NSE large caps across seven sectors, fetched from the same Yahoo chart endpoint and each verified against response symbol, exchange (NSI), currency, timezone and exact company name: RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, HINDUNILVR, ITC, BHARTIARTL, LT, SUNPHARMA. A failed listing keeps its last good data and is reported individually; other listings still refresh.

Evidence: Google News RSS search (`news.google.com/rss/search`, exact company name, last 30 days, India edition) per company, for personal non-commercial use as the feed terms state. Keep only headlines that name the company or an approved alias; deduplicate syndicated copies by normalized headline; keep publisher, Google News link, publication date (India) and retrieval time. No generated summary: headlines are shown as published, unclassified as reporting or opinion and not checked against article bodies. Curated official disclosures (RELIANCE) remain.

Signals, versioned, deterministic, alphabetical results, never a forecast: `recent-disclosure-v1` (unchanged); `price-momentum-1m-v1` = latest close vs the last close on or before one calendar month earlier, qualifies at ≥ +5%; `news-coverage-7d-v1` = distinct company-matched headlines published in the 7 India calendar days ending today, qualifies at ≥ 3. Missing history yields no value and never qualifies.

Requests: one chart and one news request per listing per refresh, sequential with a short pause; persisted shared budget 60 per rolling day (hard cap 100); per-host Retry-After/429 cooldown. Fixed allowlist: Yahoo chart paths for universe symbols only, and the Google News search path.
