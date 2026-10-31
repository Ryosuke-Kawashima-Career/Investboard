import {
  UNIVERSE,
  SIGNAL_VERSIONS,
  signals,
  indiaDate,
  calendarFrom,
  type ListingManifest,
} from "./domain.ts";
import type { Store } from "./store.ts";
export function listingSnapshot(
  store: Store,
  listing: ListingManifest,
  now = new Date(),
) {
  const history = store.history(listing.id),
    latest = history.at(-1),
    previous = history.at(-2);
  const evidence = store.evidence(listing.companyId),
    refreshed = store.get(`refreshed:${listing.id}`);
  const sourceDate = latest?.date ?? null;
  const freshness = !latest
    ? "unavailable"
    : (Date.parse(indiaDate(now)) - Date.parse(latest.date)) / 86400000 > 7
      ? "stale"
      : "unknown";
  const status = latest ? "cached" : "unavailable";
  const all = signals(listing, history, evidence, now);
  return {
    ...listing,
    verified: !!store.get(`verified:${listing.id}`),
    quote: {
      price: latest?.close ?? null,
      previousClose: previous?.close ?? null,
      currency: "INR",
      source: listing.source,
      sourceDate,
      sourceTimestamp: null,
      fetchedTimestamp: refreshed,
      timestampPrecision: "date",
      delivery: "end-of-day",
      freshness,
      cacheStatus: status,
    },
    history,
    evidence,
    newsRetrievedAt: store.get(`newsRefreshed:${listing.companyId}`),
    newsError: store.get(`newsError:${listing.companyId}`),
    error: store.get(`error:${listing.id}`),
    coverage: {
      observations: history.length,
      availableFrom: history[0]?.date ?? null,
      availableTo: sourceDate,
      gaps: "Unknown: no verified exchange calendar",
      basis: listing.basis,
    },
    // Kept for the original single-signal UI contract.
    signal: all.find((s) => s.version === "recent-disclosure-v1")!,
    signals: all,
    pe: null,
    marketCap: null,
  };
}
export function snapshot(store: Store, now = new Date()) {
  const listings = UNIVERSE.map((l) => listingSnapshot(store, l, now));
  const verified = listings.filter((l) => l.verified);
  const refreshes = verified
    .map((l) => l.quote.fetchedTimestamp)
    .filter(Boolean)
    .sort();
  const lastSuccessfulRefresh = refreshes.at(-1) ?? null;
  const meta = {
    mode: "real",
    source: "Yahoo Finance",
    evidenceSource: "Google News RSS search; curated company disclosures",
    acquisition: "api",
    timestampPrecision: "date",
    fetchedTimestamp: lastSuccessfulRefresh,
    lastSuccessfulRefresh,
    lastAttemptedRefresh: store.get("lastAttemptedRefresh"),
    status: verified.some((l) => l.history.length) ? "cached" : "unavailable",
    error: store.get("error"),
    coverage: {
      listings: verified.length,
      universe: UNIVERSE.length,
      observations: verified.reduce((n, l) => n + l.history.length, 0),
      availableFrom:
        verified
          .map((l) => l.coverage.availableFrom)
          .filter(Boolean)
          .sort()[0] ?? null,
      availableTo:
        verified
          .map((l) => l.coverage.availableTo)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null,
      gaps: "Unknown: no verified exchange calendar",
      basis: "split-adjusted",
    },
    nextCursor: null,
  };
  return { data: verified, meta };
}
const invalid = (code: string, message = "Invalid bounded query") => ({
  status: 400,
  body: { error: { code, message, retryable: false } },
});
const unsupported = {
  status: 404,
  body: {
    error: {
      code: "UNSUPPORTED_RESOURCE",
      message: "Listing or resource is unavailable",
      retryable: false,
    },
  },
};
export function route(
  store: Store,
  url: URL,
  now = new Date(),
): { status?: number; body: any } {
  const q = url.searchParams;
  const limit = q.get("limit") ?? "50",
    cursor = q.get("cursor") ?? "0";
  if (
    !/^\d+$/.test(limit) ||
    +limit < 1 ||
    +limit > 50 ||
    !/^\d+$/.test(cursor) ||
    +cursor > 10000 ||
    (q.get("q")?.length ?? 0) > 100 ||
    (q.get("sector")?.length ?? 0) > 100
  )
    return invalid("INVALID_QUERY");
  const s = snapshot(store, now);
  const envelope = (data: any, meta: any = s.meta) => ({
    body: { data, meta },
  });
  const page = (items: any[]) =>
    envelope(items.slice(+cursor, +cursor + +limit), {
      ...s.meta,
      nextCursor:
        +cursor + +limit < items.length ? String(+cursor + +limit) : null,
    });
  const term = (q.get("q") || "").toLowerCase(),
    sector = q.get("sector");
  const matching = s.data
    .filter(
      (l) =>
        `${l.name} ${l.symbol} ${l.exchange} ${l.aliases.join(" ")}`
          .toLowerCase()
          .includes(term) &&
        (!sector || l.sector === sector),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const path = url.pathname;
  if (path === "/api/health")
    return envelope({
      store: "ready",
      populated: s.data.some((l) => l.history.length),
    });
  if (path === "/api/coverage")
    return envelope({
      listings: s.data.map(({ history, evidence, signals, ...rest }) => rest),
      candidates: UNIVERSE,
      signals: SIGNAL_VERSIONS,
      mode: "real",
      acquisition: "api",
    });
  // The list carries listing-level currency/source/basis, so points stay compact;
  // the per-listing history route returns full points.
  if (path === "/api/companies")
    return page(
      matching.map((l) => ({
        ...l,
        history: l.history.map(({ date, open, high, low, close }) => ({
          date,
          open,
          high,
          low,
          close,
        })),
      })),
    );
  if (path === "/api/discovery") {
    const version = q.get("signal") ?? SIGNAL_VERSIONS[0];
    if (!SIGNAL_VERSIONS.includes(version)) return invalid("INVALID_SIGNAL");
    return page(
      matching.flatMap((l) => {
        const signal = l.signals.find((x) => x.version === version)!;
        return signal.qualifies ? [{ listingId: l.id, ...signal }] : [];
      }),
    );
  }
  const company = path.match(/^\/api\/companies\/([a-z0-9-]{1,40})(\/evidence)?$/);
  if (company) {
    const listing = s.data.find((l) => l.companyId === company[1]);
    if (!listing) return unsupported;
    return company[2] ? page(listing.evidence) : envelope(listing);
  }
  const resource = path.match(
    /^\/api\/listings\/([A-Z]{2,5})\/([A-Z0-9&-]{1,20})\/(quote|history)$/,
  );
  const listing =
    resource && s.data.find((l) => l.id === `${resource[1]}:${resource[2]}`);
  if (!resource || !listing) return unsupported;
  if (resource[3] === "quote") return envelope(listing.quote);
  const period = q.get("period") || "6M";
  if (!["1M", "6M", "1Y"].includes(period)) return invalid("INVALID_PERIOD");
  const to = indiaDate(now),
    from = calendarFrom(to, period);
  return envelope(
    listing.history.filter((p) => p.date >= from && p.date <= to),
    {
      ...s.meta,
      coverage: {
        ...listing.coverage,
        requestedFrom: from,
        requestedTo: to,
        completeness: !listing.history.length
          ? "unavailable"
          : listing.history[0].date > from
            ? "partial"
            : "unknown",
      },
    },
  );
}
