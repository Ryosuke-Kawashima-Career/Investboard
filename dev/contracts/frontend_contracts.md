# Phase 1 fixture and provisional API contracts

Implementation: `src/data.ts`, `src/useWatchlist.ts`. Framework: React 19 + TypeScript, Vite 6, Lucide icons; Playwright browser verification and Vitest contract checks. Dependencies are reproducible through `package-lock.json`.

## Shared entities

- Company: `companyId`, `name`, `sector`, `description`; one company may have multiple listings.
- Listing: `id` is `exchange:symbol`, `exchange` is NSE or BSE, plus `symbol`, and shared company identity. TCS has two distinct listings. Five companies, six listings in total.
- Quote: nullable `price`/`previousClose`, INR currency, source, source and fetched timestamps, delivery mode and freshness. Phase 1 modes are `synthetic` and `demo`/`unavailable`. Absolute and percentage change are derived; absent price or previous close yields no movement, zero previous close yields unavailable percentage. Real backend modes and freshness thresholds must be added explicitly in Phase 2.
- History: listing-owned dated OHLC observations, INR, source and unadjusted basis. Open/high/low are optional contract fields: close-only feeds can use line charts without inventing candles. Demo OHLC is generated deterministically and visibly labeled synthetic; the final two closes match the quote and previous close. Company charts default to candles with a line switch, pointer/arrow-key inspection, OHLC readout and INR scale. Daily bars are used for 1M, calendar-week bars for 6M and calendar-month bars for 1Y; each bucket preserves first open, last close, maximum high and minimum low. Partial boundary periods are labeled. Period views select the last 22/130/260 synthetic weekdays as 1M/6M/1Y approximations. Fixtures do not model exchange holiday calendars; no claim of real trading-day coverage is made. Data runs 31 October 2025 through 30 October 2026. No interpolation fills weekends. Charts label dates, currency and basis.
- Evidence: ID, company association, title, publisher, URL, nullable publication date, retrieved timestamp, summary, opportunity/risk type, synthetic coverage. External destinations are company investor-relations pages, explicitly not proof of the illustrative claims. Phase 2 must replace both notes and links with verified claim-level evidence.
- Signal: name, `demo-v1`, nullable value, period, definition, evidence IDs. Revenue growth = (FY2026 annual revenue / FY2025 annual revenue − 1) × 100. Growth filter uses ≥10%, excludes missing values; alphabetical listing order is never a return forecast. All values remain illustrative.
- Watchlist: `{version: 1, listingIds: string[]}` in `arbor.watchlist.v1`. Unknown IDs are discarded, duplicates removed, corrupt or unavailable storage shows a message and preserves session usability. Clear writes a valid empty list. Nothing is sent to a server.

## Provisional read API for Phase 2

These are design contracts, not implemented endpoints. Use an adapter to normalize actual responses into the frontend types. Bounded filters, timestamps and unavailable values must survive normalization.

| Route | Query / identity | Response |
|---|---|---|
| `GET /api/companies` | `q` max 100 characters, `limit` 1–50, cursor | companies and distinct listing identities, coverage metadata |
| `GET /api/listings/:exchange/:symbol/quote` | allowlisted exchange and validated symbol | quote, delivery, freshness and last successful refresh |
| `GET /api/listings/:exchange/:symbol/history` | `period=1M\|6M\|1Y` | observations, source, basis, date range and gap metadata |
| `GET /api/companies/:companyId` | supported company ID | profile, nullable fundamentals with period/source |
| `GET /api/companies/:companyId/evidence` | cursor, limit 1–50 | verified evidence and coverage metadata |
| `GET /api/discovery` | sector, versioned signal, cursor, limit 1–50 | listing IDs, computation metadata, evidence references, limitations |

Common envelope: `{data, meta: {sourceTimestamp, fetchedTimestamp, lastSuccessfulRefresh, coverage, status, nextCursor}}`, with nullable timestamps where inapplicable. Status is ready/partial/unavailable/cached; structured errors are `{error: {code, message, retryable}}`. Provider failure must not silently fall back to synthetic fixtures.

Provider, licenses, universe expansion, feed freshness, real signal definitions, exact runtime validation and deployment are pending TASK-03–TASK-07 decisions. No integration or public launch readiness is implied.

## Verification record · 31 October 2026

Production build passed. Ten unit checks cover OHLC invariants, calendar aggregation, close-only handling, quote/history consistency, as well as signed quote changes, null/zero handling, identity, history date integrity and signal references. Fourteen Playwright journeys passed across desktop and 360px, covering search, history periods, external link targets, filters, empty states, keyboard search, dialog dismissal, error retry, partial fundamentals, storage corruption, storage denial, exchange-specific persistence, remove and clear. Visual review uses the discovery and company screenshots in `../previews/`. No horizontal overflow was found in either screen at either width. Full contrast/accessibility and throttled performance audits remain TASK-07.

