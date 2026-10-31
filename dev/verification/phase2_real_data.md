# Phase 2 implementation and acquisition verification

Date: 31 October 2026. Spec/plan 1.4.0. **Phase 2 exit achieved** for local personal research.

## Actual source result

- Prices: Yahoo Finance chart endpoint (the same service yfinance uses). 10 NSE listings (RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, HINDUNILVR, ITC, BHARTIARTL, LT, SUNPHARMA), each verified for symbol, NSI exchange, INR, Asia/Kolkata and exact company name. **248 daily sessions per listing, 2025-10-30 to 2026-10-30**, split-adjusted.
- Evidence: Google News RSS search, exact company name, last 30 days. **198 company-matched, deduplicated headlines** across the 10 companies (max 20 each), plus the curated Reliance filing.
- The existing single-listing database was migrated in place (v1 to v2) without losing the RELIANCE history.
- Budget: one full refresh is 20 requests (10 chart + 10 news). Default daily ceiling raised from 20 to 60 (`.env`, `.env.example`).

## Executed checks

- `npm run build`: passed.
- `npm run test:unit`: 24 passed (adds news parsing, alias matching, momentum and news-coverage windows).
- `npm run test:integration`: 18 passed (adds full-universe offline refresh, partial-failure isolation, v1 store migration, transport allowlist). All provider responses are synthetic.
- `npm run test:e2e -- --workers=4`: 26 passed on desktop and 360px (adds signal filtering and news-link journey).
- `npm run test:performance`: 2517 to 2810 ms primary content usable on real cached data (target under 3000 ms; 360px, 4x CPU, 1.6 Mbps). `/api/companies` is 136 KB gzipped.
- `node scripts/trial.mjs`: real mode, 0 upstream calls, 10 listings, disclosure link and save/reload passed.
- Browser pane on the production server: discovery list, company page signals and news links render; no console errors.

## Limitations

- Yahoo Finance and Google News are unofficial, best-effort sources. Google News RSS is for personal, non-commercial use, so there is no public deployment.
- Headlines have no summary and no positive/negative or reporting/opinion classification. Article links go through Google News redirects.
- `news-coverage-7d-v1` counts at most the 20 stored headlines per company.
- Performance margin is thin: all histories and headlines load in one response. Loading history on the company page instead is the next step if the universe grows.
- P/E, market cap and revenue growth are still unavailable.
