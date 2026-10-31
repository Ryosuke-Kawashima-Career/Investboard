---
document_type: "specification"
version: "1.1.0"
status: "Draft"
last_updated: "2026-10-31"
author: "Codex"
---

# Indian equity research MVP specification

Build a mobile-friendly web application that helps people in India view Indian stock prices and discover companies worth further research using traceable public web information. Start with a clear research experience and explainable discovery signals so users can assess evidence before making their own investment decisions.

Implementation: [Implementation plan](../plans/implementation_plan_indian_equity_research.md), version 1.1.0.

## User need and scope

Original need: help Indian people invest in Indian companies by making stock prices easy to see and using web information to find promising companies.

Primary user: an individual investor in India who needs understandable prices and a starting point for company research. Investment experience, preferred language, budget, and investment horizon are not yet known.

MVP assumptions: English interface, INR prices, Indian exchange-listed equities, responsive web delivery, delayed or end-of-day data acceptable when clearly labeled, and a deliberately limited company universe based on available licensed data. Users can research without registration. These are proposed product choices, not confirmed user requirements.

The MVP supports research and a local watchlist. Brokerage connectivity, order execution, portfolio management, personalized recommendations, guaranteed returns, price predictions, derivatives, funds, multilingual support, and automatic trading are outside MVP scope. Additional languages and server-synced watchlists are post-MVP candidates.

| Option | Reason for rejection |
|---|---|
| Brokerage and order execution first | Adds dependencies beyond the stated price and research need |
| Opaque AI stock picks | Cannot make the basis of discovery easy to inspect |
| Full-market real-time terminal | Data cost and interface complexity exceed the initial need |

## User journeys

- Search for a company or symbol, select the correct exchange listing, and inspect its price and recent history.
- Browse companies using sector and evidence-based discovery filters, then inspect why a company appeared.
- Open a company page, read recent positive and negative developments, and follow links to the original sources.
- Save a company to a watchlist and return later to review updated information.

## Requirements and acceptance criteria

| ID | Requirement | Acceptance criteria |
|---|---|---|
| REQ-01 | Search Indian listed companies | Search by name or symbol; results show company, symbol, and exchange. Distinct exchange listings are unambiguous. Unknown queries show a helpful empty state. Display the supported universe and coverage limits. |
| REQ-02 | Make stock prices easy to understand | Show INR price, absolute and percentage change against previous close, exchange, source, quote timestamp, and live/delayed/end-of-day status. Missing or stale values are labeled; never substitute zero. Market closures preserve the actual quote timestamp. |
| REQ-03 | Provide company research pages | Show company identity, sector, latest quote, and selectable 1-month, 6-month, and 1-year history where available. Offer line and candlestick views with open/high/low/close (OHLC) values, a rise/fall text legend, and pointer/keyboard inspection. Use daily candles for 1M, calendar-week candles for 6M, and calendar-month candles for 1Y; aggregation preserves first open, last close, maximum high and minimum low. Never derive real OHLC from close-only feeds; candlesticks require supplied OHLC, while demo OHLC must be explicitly synthetic. Label chart currency, dates, data gaps, and adjusted/unadjusted basis. Unavailable fundamentals remain unavailable; supplied fundamentals show period and source. |
| REQ-04 | Discover companies with explainable signals | Offer sector filtering and transparent signals such as revenue growth, profitability, valuation context, or recent business developments when supported by data. Each signal states definition, observation period, source, and limitations. Missing data never improves rank. Define and version any ordering formula before enabling it; do not present ordering as a return forecast. |
| REQ-05 | Turn web information into traceable evidence | Each company-linked item shows headline, publisher, source URL, publication date when available, retrieval time, and a short factual summary. Prefer filings and company disclosures where available; distinguish reporting from opinion. Deduplicate syndicated stories, verify company association, and disclose stale coverage and conflicting evidence. Every generated factual claim must link to supporting evidence or be omitted. |
| REQ-06 | Support a simple watchlist | Add/remove distinct company listings and persist them locally across reloads. Show price and freshness for each entry; explain device-only storage. Handle unavailable browser storage without breaking research. |
| REQ-07 | Keep the experience usable | Search, discovery, company details, and watchlist work at 360px and desktop widths, with keyboard navigation, visible focus, descriptive labels, and text indicators for price direction. Provide loading, empty, partial-data, and retry states. Target primary cached views usable within 3 seconds under a documented mobile test profile. |
| REQ-08 | Present research responsibly | Explain that discovery supports independent research and does not guarantee returns. Show risks and contrary evidence beside opportunities; avoid personalized buy/sell instructions. Before public launch, document the applicable data-use permissions and obtain a qualified review of the intended product's regulatory obligations. |
| REQ-09 | Operate a reliable data pipeline | Use server-side provider adapters, validated payloads, caching, retry/backoff, and quotas. Track last successful refresh separately from source timestamps. Provider failure serves labeled cached data where available, otherwise an unavailable state. Demo fixtures are visibly marked and never presented as current quotes. |
| REQ-10 | Protect service and user data | Keep provider credentials on the server, collect no brokerage credentials, allow clearing the local watchlist, validate inputs, restrict fetched sources, escape external text, and treat retrieved content as untrusted data. Log operational failures without credentials or personal watchlist contents. |

## Proposed architecture and data contracts

Phase 1 uses React 19, TypeScript and Vite 6 for a responsive fixture-backed frontend, with Playwright browser journeys and Vitest contract tests. macos-ui-polish tokens provide the framed light workspace. The local demonstration contains five companies and six distinct exchange listings. See [frontend contracts](../contracts/frontend_contracts.md) for normalized entities and provisional API interfaces. A server API and background ingestion remain Phase 2 work; no provider is connected. Deliver the frontend with fixtures first, then connect the same contracts to real providers.

Data flow: approved market/content providers -> adapters -> validation and normalization -> cache/store -> query API -> UI. Background jobs refresh quotes and content independently. Start with provider-permitted refresh intervals; the UI must not imply real-time delivery without a provider guarantee.

Minimum normalized entities:

- Company: internal company ID, display name, sector, supported listing IDs; listing identity includes exchange and symbol rather than symbol alone.
- Quote: listing ID, currency, price, previous close, absolute/percentage change, source timestamp, fetched timestamp, source, delivery mode, and freshness status. Define zero-previous-close handling as unavailable percentage change.
- History point: listing ID, trading date/time, close, optional open/high/low for candlesticks, currency, source, and adjustment basis; do not invent points for closed days or missing data.
- Evidence: ID, company ID, title, publisher, canonical URL, published timestamp (nullable), retrieved timestamp, summary, evidence links, and coverage status.
- Discovery signal: company ID, signal name/version, value, period, evidence references, computation definition, and missing-data status.
- Watchlist: versioned local list of listing IDs with a clear/reset action.

Proposed read interfaces: company search; listing quote and history; company profile and paginated evidence; discovery results with filter and explanation metadata. Validate query parameters, bound page sizes, return explicit partial/unavailable states, and use a common error shape. Exact routes and storage are implementation decisions.

Use deterministic extraction and signal calculation first. An optional summarizer must only consume permitted evidence, produce claim-level references, resist instructions in retrieved text, and abstain when evidence cannot support a summary. Do not require a generative model for core price and search functionality.

## Release criteria and unresolved decisions

Release requires all REQ-01 through REQ-10 acceptance criteria to pass, working source attribution, a usable mobile research journey, and a provider outage demonstration. No production quote claims may be based on fixture data.

Resolve before live integration: target exchanges/universe, provider permissions and cost, historical adjustment support, content access rights, deployment environment, freshness thresholds per feed, and a precise discovery formula. Resolve before public launch: qualified regulatory review and approved product wording. No current legal conclusion or financial recommendation is asserted by this document.

Measure task success during usability review: can a participant find a company, identify the quote's freshness, explain one discovery signal, locate its evidence, and save it? Record failures and revise both documents before extending scope.

## Revision history

| Version | Date | Change | Trigger | Status |
|---|---|---|---|---|
| 1.0.0 | 2026-10-31 | Initial MVP scope, contracts, and acceptance criteria | User need | Draft |
| 1.0.1 | 2026-10-31 | Recorded the Phase 1 framework, fixture universe, contract document and verification boundaries | Initial frontend implementation | Draft |
| 1.1.0 | 2026-10-31 | Added inspectable OHLC candlestick bars alongside line history | User chart request | Draft |

