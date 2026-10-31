---
document_type: "implementation_plan"
version: "1.1.0"
target_spec_version: "1.1.0"
status: "In Progress"
last_updated: "2026-10-31"
author: "Codex"
---

# Indian equity research implementation plan

Delivery order: Front UI/UX implementation -> Minimum workable backend implementation -> Feedback and improvement by the user. Deliver a complete fixture-backed interface first, connect the smallest backend that makes the core research journey work, then improve the working product from actual user feedback.

Specification: [Indian equity research MVP](../specs/spec_indian_equity_research.md), version 1.1.0. Phase 1 is implemented and verified with synthetic fixtures; Phase 2 and Phase 3 remain pending. See [frontend contracts and verification record](../contracts/frontend_contracts.md).

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

- [ ] TASK-03 — Implement a thin server API and one market-data adapter for company search, quote, profile, and history. Validate payloads and inputs; keep credentials server-side. Add bounded requests, basic caching, retry/backoff, and a provider-permitted refresh mechanism. Handle exchange collisions, zero previous close, gaps, market closures, stale data, and outages. Connect the Phase 1 UI to real supported data. Covers REQ-01–REQ-03, REQ-09, REQ-10. Verification: `npm run test:unit -- market-data.test.ts` and `npm run test:integration -- market-api.test.ts`. Exit: a supported company can be searched and inspected end to end with truthful prices, sources, and timestamps.
- [ ] TASK-04 — Connect one approved web-evidence source. Implement company matching, URL canonicalization, deduplication, publication/retrieval timestamps, and short factual summaries with evidence links, contrary evidence, and abstention. Start with deterministic extraction; a generative model is optional. Restrict fetched sources and escape external text. Covers REQ-05, REQ-08–REQ-10. Verification: `npm run test:integration -- evidence-pipeline.test.ts`. Include unrelated similarly named companies, duplicate stories, missing dates, conflicting reports, blocked sources, and instruction-bearing content. Exit: the UI shows genuine company-linked evidence with no unsupported summary claims.
- [ ] TASK-05 — Implement sector filtering and the smallest useful set of versioned discovery signals supported by the chosen data. Expose computation, period, sources, missing values, risks, and limitations. Covers REQ-04, REQ-05, REQ-08. Verification: `npm run test:unit -- discovery.test.ts` and `npm run test:e2e -- discovery.spec.ts`. Include tied values, missing fundamentals, stale evidence, and empty filters. Exit: discovery results are reproducible and explainable.
- [ ] TASK-07 — Verify minimum backend reliability and protection before the user trial: input validation, secret handling, content escaping, fetch allowlists, quotas, safe logs, and labeled cached/unavailable behavior during outages. Check frontend accessibility and cached-view performance under a documented mobile profile. Covers REQ-07, REQ-09, REQ-10. Verification: `npm run test:integration -- service-resilience.test.ts`, `npm run test:e2e -- accessibility.spec.ts`, and `npm run test:performance`. Exit: no credentials or watchlists appear in logs; core views remain usable during provider failures and meet the specified 3-second cached-view target.

Phase exit: the user can complete the core research journey with real supported data and the local watchlist. Keep deployment simple; multiple providers, distributed infrastructure, and optional AI must not delay this milestone. Required data permissions, attribution, freshness, and basic protections remain part of the minimum implementation. A controlled user trial is distinct from public launch.

### Phase 3: Feedback and improvement by the user

- [ ] TASK-08 — Give the user the working product and guide a review of finding a company, identifying price freshness, explaining a discovery signal, opening its evidence, and saving it. Record feedback as concrete observations, expected behavior, priority, and acceptance criteria. Address blockers first, then usability and research-quality improvements. For each iteration, update affected specification requirements and plan tasks before implementation, make the change, verify the affected journey, and return it to the user for another review. Covers REQ-01–REQ-10. Verification: record the review results and run `npm run test:e2e -- research-feedback.spec.ts` for changed critical journeys; run affected unit/integration checks. Exit: agreed feedback is resolved or explicitly deferred with the user, and the user can complete the research journey.

Before public launch, TASK-08 also audits data permissions, source attribution, universe disclosure, fixture separation, and research wording; records qualified review of applicable regulatory obligations; and verifies all specification acceptance criteria. Final commands: `npm run build`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:performance`, and `python .codex/skills/spec-plan-sync/scripts/verify_spec_plan_sync.py`. Public launch is not a prerequisite for collecting feedback on the working MVP.

Dependencies: Phase 1 executes TASK-01 -> TASK-02 -> TASK-06. Phase 2 follows the Phase 1 exit and executes provider decisions -> TASK-03 -> TASK-04 -> TASK-05 -> TASK-07. Phase 3 follows the Phase 2 exit and executes TASK-08 as a repeatable user-feedback loop. Task IDs are preserved for traceability; execution follows phase order rather than numeric order. Do not mark a task complete until its verification and exit criteria pass.

## Requirement traceability

| Requirement | Implementation tasks | Main verification evidence |
|---|---|---|
| REQ-01 | TASK-01, TASK-02, TASK-03, TASK-08 | Search, universe disclosure, exchange collision tests |
| REQ-02 | TASK-01, TASK-02, TASK-03, TASK-08 | Quote calculations, timestamp and stale/outage tests |
| REQ-03 | TASK-01, TASK-02, TASK-03, TASK-08, TASK-09 | Profile/history contracts and missing-data tests |
| REQ-04 | TASK-01, TASK-02, TASK-05, TASK-08 | Deterministic discovery and explanation tests |
| REQ-05 | TASK-01, TASK-02, TASK-04, TASK-05, TASK-08 | Attribution, deduplication and claim-evidence tests |
| REQ-06 | TASK-06, TASK-08 | Watchlist persistence, reset and storage-failure tests |
| REQ-07 | TASK-02, TASK-07, TASK-08, TASK-09 | Responsive, keyboard, accessibility and performance checks |
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


