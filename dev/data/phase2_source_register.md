# Phase 2 source register · 31 October 2026

## Selected path and scope

Alpha Vantage daily API, one BSE listing, local individual research trial only. No purchase, signup, public deployment or redistribution. CSV is unselected; `data:import` explicitly exits unsupported. No admissible CSV was supplied, so the acquisition blocker is not hidden with generated data.

## Identity and provenance

- Company: Reliance Industries Limited; company ID `reliance`.
- Canonical application listing: `BSE:RELIANCE`; BSE scrip 500325; ISIN INE002A01018.
- Provider mapping `RELIANCE.BSE`, Equity, India/Bombay, INR verified by actual `SYMBOL_SEARCH` on 2026-10-31 at 07:46:49 UTC (13:16:49 IST).
- Official identity corroboration and evidence: [exchange-hosted company filing](https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_INDAS_175606_17072026194906_iXBRL_WEB.html), General information about company.
- Diversified is an application sector grouping, supported by the company's multiple reported segments; it is not a provider industry taxonomy. Profile description is a short paraphrase of the [company investor-relations material](https://www.ril.com/investors/investor-relations).
- Daily adapter: `TIME_SERIES_DAILY`, compact, raw unadjusted INR OHLC/volume. No independent quote call, adjusted series splice, gap filling or inferred candles.

## Actual access outcome

Two outbound attempts in total: identity verification succeeded; daily history returned an Alpha Vantage `Information` or `Note` payload. Stored error: `PROVIDER_LIMIT_OR_ENTITLEMENT`. No OHLC observations acquired. The raw provider message was deliberately not retained, so the precise quota-versus-entitlement explanation is **not established**. Do not claim that the key is invalid, that BSE daily access is free, or that a paid upgrade is necessary.

A persisted cooldown ends 2026-11-01 07:46:49.564 UTC (13:16:49.564 IST). The backend will not bypass it. A later budgeted operator check can establish whether access has recovered; otherwise obtain provider access details or an admissible actual source export before choosing an import implementation. No automatic reminder was created.

## Conditions and operations

[Terms](https://www.alphavantage.co/terms_of_service/) reviewed 2026-10-31: section 2 grants personal non-commercial use; commercial/distributed uses require separate arrangements. This implementation binds only to loopback. No public display/redistribution entitlement is asserted. The [support page](https://www.alphavantage.co/support/) describes 25 free calls/day; actual account allowance remains unverified. We use a ceiling of 20 in rolling 24 hours because reset semantics are unknown; a lower configured limit wins. Setup, failed attempts and retries are counted in SQLite. The provider's response limit/cooldown wins over the local ceiling.

Normalized data stays in ignored local SQLite for the trial; raw responses and the credential are not committed. The terms do not establish a separate unlimited retention/redistribution right. Retain only for the authorized local research purpose; reassess permissions before broader use and remove the local database when that use ends. Provider attribution appears on every quote and history source. Do not commit or publish the local store.

Startup acquisition runs only if no prices exist; subsequent scheduled attempts occur on weekdays at/after 19:00 Asia/Kolkata, once per day, plus explicit CLI refresh. A SQLite lease coalesces concurrent processes. Ten-second per-request timeout, at most one transient retry with jitter, no retry on quota/key/entitlement payloads, Retry-After cooldown. Fixed HTTPS host/path, resolved public addresses only, no redirects. No upstream requests from browser search, period switches or watchlist actions.

No verified exchange calendar is installed: freshness is unknown with source date, conservatively stale after seven calendar days. A date-only observation is never presented as an intraday timestamp. Compact history coverage is partial where appropriate.

## Curated disclosure

`reliance-disclosure.json` is an operator-verified short paraphrase of the exact exchange-hosted original above. This was selected after reviewing official company IR material; the exchange original provides specific company identity and claim locations without an automated crawler. Source author/publisher is Reliance; host is NSE. The record identifies unaudited standalone results for 30 June 2026 and a 17 July board approval. Publication date is unknown: neither the board date nor filename is treated as publication proof. Consequently it does not qualify for recent-disclosure-v1. Retrieval and verification timestamps are actual and stored in the JSON. No original document is copied into the repository; the original opens on its source host. No independent or contrary evidence is claimed.
