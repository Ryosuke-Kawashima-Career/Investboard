# India Forward · Invest in the Indian future

## Run locally

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. No credentials or backend are needed.

## Review the experience

Search for TCS and choose its NSE or BSE listing. Open a company, switch between candlestick and line charts, change the history period, inspect OHLC prices with the pointer or arrow keys, inspect its signal and both research notes, and follow a company disclosures link. Save listings, open Watchlist, reload, remove an entry or clear the list. Ctrl+K (also Cmd+K) focuses search. The Synthetic Data button explains the methodology and lets you exercise loading, error/retry and partial-data states.

## Verify

```sh
npm run build
npm run test:unit
npx playwright install chromium
npm run test:e2e
```

The browser suite covers 1440px desktop and 360px mobile journeys.
