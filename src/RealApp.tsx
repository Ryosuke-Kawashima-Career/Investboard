import { useEffect, useState } from "react";
import { Bookmark, Leaf, Search, ArrowLeft, Info } from "lucide-react";
import { money } from "./data";
import { summarizePeriod } from "./chart-data";
import { StockChart, describeChange } from "./StockChart";
import { useWatchlist } from "./useWatchlist";
import { SentimentPanel } from "./SentimentPanel";
import { AgentChat } from "./AgentChat";
import { realAgentContext } from "./agent";
import { TONE_THRESHOLD, evaluateTone, headlineToneBundle } from "./tone";
import {
  loadCompany,
  loadResearch,
  rangeStart,
  signalSummary,
  type RealResponse,
  type RealListing,
} from "./service";
const SIGNAL_OPTIONS = [
  ["price-momentum-1m-v1", "1-month price change ≥ +5%"],
  ["news-coverage-7d-v1", "3+ headlines in 7 days"],
  ["recent-disclosure-v1", "Recent official disclosure"],
];
function Evidence({ e }: { e: RealListing["evidence"][number] }) {
  const news = e.type === "news-report";
  return (
    <article className="evidence-card">
      <h3>{e.title}</h3>
      {e.summary && <p>{e.summary}</p>}
      <p className="small muted">
        {e.publisher} · {news ? "News headline" : "Company disclosure"}
        {e.syndicatedCopies ? ` · ${e.syndicatedCopies} syndicated copies` : ""}
      </p>
      <p>
        Published: {e.publishedAt || "Unknown"} · Retrieved: {e.retrievedAt}
      </p>
      {!!e.claimLocations.length && (
        <p>Claim locations: {e.claimLocations.join("; ")}</p>
      )}
      <p className="small muted">{e.limitations}</p>
      <a href={e.url} target="_blank" rel="noopener noreferrer">
        {news ? "Open article via Google News" : "Open original disclosure"} ↗
      </a>
    </article>
  );
}
function Quote({ listing }: { listing: RealListing }) {
  const q = listing.quote,
    delta =
      q.price !== null && q.previousClose !== null
        ? q.price - q.previousClose
        : null;
  return (
    <div className="price large">
      <strong>{q.price === null ? "Unavailable" : money(q.price)}</strong>
      {delta !== null && (
        <span className={delta >= 0 ? "up" : "down"}>
          {delta >= 0 ? "Up" : "Down"} {money(Math.abs(delta))} (
          {q.previousClose
            ? ((Math.abs(delta) / q.previousClose) * 100).toFixed(2) + "%"
            : "percentage unavailable"}
          )
        </span>
      )}
      <small>
        {q.source} · End-of-day · {q.sourceDate || "No observation"} ·{" "}
        {q.cacheStatus}
      </small>
      <small>Freshness: {q.freshness}. No verified exchange calendar.</small>
    </div>
  );
}
/** Close-only last-month trend; rows without two observed sessions show none. */
function ObservedSparkline({
  listing,
  today,
}: {
  listing: RealListing;
  today: string;
}) {
  const from = rangeStart(today, "1M"),
    points = listing.history.filter((p) => p.date >= from && p.date <= today),
    summary = summarizePeriod(points);
  if (!summary) return null;
  const width = 300,
    height = 44,
    closes = points.map((p) => p.close),
    min = Math.min(...closes),
    span = Math.max(...closes) - min || 1;
  const coords = closes
    .map(
      (c, i) =>
        `${(i / (closes.length - 1)) * width},${height - 3 - ((c - min) / span) * (height - 6)}`,
    )
    .join(" ");
  const label = `${describeChange(summary.change, summary.percent)} since ${summary.firstDate}`;
  return (
    <figure className="observed-sparkline-figure">
      <svg
        className="observed-sparkline"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${listing.name} observed 1M closing prices, INR: ${label}`}
        preserveAspectRatio="none"
      >
        <polyline
          points={coords}
          stroke={summary.change < 0 ? "#af6757" : "#36876a"}
          strokeWidth="2"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="small muted">
        Last month, observed closes · {label}
      </figcaption>
    </figure>
  );
}
export default function RealApp() {
  const [result, setResult] = useState<RealResponse | null>(null),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const [view, setView] = useState("discover"),
    [selected, setSelected] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [sector, setSector] = useState("All sectors"),
    [signalFilter, setSignalFilter] = useState("all"),
    [period, setPeriod] = useState("6M"),
    [method, setMethod] = useState(false);
  const watchlist = useWatchlist(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    loadResearch(controller.signal)
      .then(setResult)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  const listings = result?.data || [],
    picked = listings.find((l) => l.id === selected);
  // The list API sends compact summaries; the company page loads the full
  // listing (all history and evidence). Fixture payloads without the marker
  // are already complete. Spec 1.8.0.
  const [full, setFull] = useState<{
    id: string;
    data: RealListing | null;
    error: boolean;
  } | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const needsDetail = picked?.detail === "summary";
  useEffect(() => {
    if (!picked || !needsDetail) return;
    const controller = new AbortController();
    setFull({ id: picked.id, data: null, error: false });
    loadCompany(picked.companyId, controller.signal)
      .then((data) => setFull({ id: picked.id, data, error: false }))
      .catch(() => {
        if (!controller.signal.aborted)
          setFull({ id: picked.id, data: null, error: true });
      });
    return () => controller.abort();
  }, [picked?.id, needsDetail, detailRevision]);
  const listing = needsDetail
    ? full?.id === picked!.id
      ? full.data
      : null
    : picked;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const from = rangeStart(today, period);
  const filtered = listings
    .filter(
      (l) =>
        (view !== "watchlist" || watchlist.ids.includes(l.id)) &&
        (sector === "All sectors" || l.sector === sector) &&
        (signalFilter === "all" ||
          l.signals.some((s) => s.version === signalFilter && s.qualifies)) &&
        `${l.name} ${l.symbol} ${l.exchange} ${l.sector}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const save = (l: RealListing) => (
    <button
      className="icon-button save"
      aria-label={`${watchlist.ids.includes(l.id) ? "Remove" : "Save"} ${l.symbol} ${l.exchange}`}
      aria-pressed={watchlist.ids.includes(l.id)}
      onClick={() => watchlist.toggle(l.id)}
    >
      <Bookmark
        size={19}
        fill={watchlist.ids.includes(l.id) ? "currentColor" : "none"}
      />
    </button>
  );
  return (
    <div className="macos-app-shell">
      <a href="#main" className="skip-link">
        Skip to research
      </a>
      <div className="macos-framed-canvas app-layout">
        <aside className="sidebar">
          <a href="#" className="brand" onClick={() => setSelected(null)}>
            <span className="brand-mark">
              <Leaf />
            </span>
            <span className="brand-name">
              India
              <br />
              Forward
            </span>
          </a>
          <div className="workspace-label">YOUR RESEARCH SPACE</div>
          <nav aria-label="Main navigation">
            {["discover", "watchlist"].map((v) => (
              <button
                key={v}
                className={`nav-item ${view === v ? "active" : ""}`}
                onClick={() => {
                  setView(v);
                  setSelected(null);
                  setQuery("");
                  setSignalFilter("all");
                  setSector("All sectors");
                }}
              >
                {v === "discover" ? "Discover" : "Watchlist"}{" "}
                {v === "watchlist" && watchlist.ids.length}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <h3>Evidence before instinct.</h3>
            <p>Observed prices, linked headlines and explicit coverage.</p>
            <button className="text-button" onClick={() => setMethod(!method)}>
              Our research approach
            </button>
          </div>
          <div className="sidebar-bottom">Real data · local research</div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              Workspace / {picked?.symbol || view}
            </div>
            <div className="search-box">
              <Search size={17} />
              <input
                aria-label="Search companies or symbols"
                placeholder="Search companies or symbols…"
                maxLength={100}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
              />
            </div>
            <span className="demo-badge">REAL DATA</span>
          </header>
          <main id="main" tabIndex={-1}>
            <div className="demo-notice">
              <Info size={14} />
              <span>
                Local research trial · {listings.length} verified NSE listing(s)
                · End-of-day observations, not a live feed.
              </span>
            </div>
            {watchlist.warning && (
              <p role="status" className="storage-warning">
                {watchlist.warning}
              </p>
            )}
            {method && (
              <section className="chart-panel">
                <h2>Research approach</h2>
                <p>
                  price-momentum-1m-v1 compares the latest close with the last
                  close on or before one calendar month earlier; it qualifies at
                  +5% or more. Past movement only, never a forecast.
                </p>
                <p>
                  news-coverage-7d-v1 counts distinct headlines naming the
                  company, published in the last 7 calendar days (Google News
                  search); it qualifies at 3 or more. It measures attention, not
                  sentiment: coverage may be negative or opinion.
                </p>
                <p>
                  recent-disclosure-v1 includes verified official company
                  disclosures published within 30 calendar days in Asia/Kolkata,
                  including today. Unknown or future dates never qualify.
                  Companies are alphabetical, with no forecast or ranking.
                </p>
                <p>
                  Headlines are shown as published, without summaries, and are
                  not checked against article bodies. P/E, market cap and growth
                  are unavailable until separately sourced.
                </p>
                <button onClick={() => setMethod(false)}>
                  Close research approach
                </button>
              </section>
            )}
            {loading && <p role="status">Loading research…</p>}
            {error && (
              <div role="alert" className="storage-warning">
                Research API unavailable.{" "}
                {result
                  ? "Last loaded observations remain visible."
                  : "No cached response is available in this browser."}
                <button onClick={() => setRevision((r) => r + 1)}>Retry</button>
              </div>
            )}
            {result?.meta.error && (
              <p role="status" className="storage-warning">
                Price refresh is unavailable.{" "}
                {result.meta.error.code === "PROVIDER_LIMIT_OR_ENTITLEMENT"
                  ? "Yahoo Finance reported a request limit or access restriction. "
                  : "The market source could not supply data. "}
                {result.meta.error.failedListings?.length
                  ? `Affected: ${result.meta.error.failedListings.join(", ")}. `
                  : ""}
                {listings.some((l) => l.history.length)
                  ? "Last good observations are retained."
                  : "No stored price observations are available."}
              </p>
            )}
            {picked && !listing ? (
              <section
                className="chart-panel detail-loading"
                aria-live="polite"
              >
                <button
                  className="text-button"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft size={16} /> Back to companies
                </button>
                <h1>{picked.name}</h1>
                {full?.error ? (
                  <>
                    <p>
                      Full history and headlines could not be loaded. Nothing is
                      shown in their place.
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => setDetailRevision((n) => n + 1)}
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <p>Loading full history and headlines…</p>
                )}
              </section>
            ) : listing ? (
              <>
                <button
                  className="text-button"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft size={16} /> Back to companies
                </button>
                <section className="detail-header">
                  <div>
                    <div className="eyebrow">
                      {listing.exchange} · {listing.symbol} · INR
                    </div>
                    <h1>{listing.name}</h1>
                    <p>{listing.description}</p>
                  </div>
                  {save(listing)}
                </section>
                <Quote listing={listing} />
                <p className="small muted">
                  Retrieved: {listing.quote.fetchedTimestamp || "Never"} · Last
                  attempt: {result?.meta.lastAttemptedRefresh || "Never"}
                </p>
                <section className="chart-panel">
                  <div className="section-heading">
                    <h2>Price history</h2>
                    <div className="macos-segmented-track">
                      {["1M", "6M", "1Y"].map((p) => (
                        <button
                          className="macos-segmented-btn"
                          key={p}
                          aria-pressed={period === p}
                          onClick={() => setPeriod(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <StockChart
                    listing={listing}
                    period={period}
                    real
                    rangeFrom={from}
                    rangeTo={today}
                  />
                  <p className="small muted">
                    Requested {from} – {today}. Available{" "}
                    {listing.history[0]?.date || "none"} –{" "}
                    {listing.history.at(-1)?.date || "none"} (
                    {listing.history.length} observed sessions).{" "}
                    {listing.history[0]?.date > from
                      ? "Partial history for this range."
                      : "Coverage uncertain without an exchange calendar."}{" "}
                    No gap filling. Yahoo prices are split-adjusted, not
                    dividend-adjusted; corporate actions.
                  </p>
                </section>
                <section className="chart-panel">
                  <h2>Company details</h2>
                  <p>
                    Sector: {listing.sector} · P/E: Unavailable · Market cap:
                    Unavailable · Revenue growth: Unavailable
                  </p>
                  {listing.signals.map((s) => (
                    <div key={s.version}>
                      <h3>{signalSummary(s)}</h3>
                      <p>{s.definition}</p>
                      <p className="small muted">
                        {s.version} · {s.period} · Source: {s.source} ·{" "}
                        {s.qualifies ? "Qualifies" : "Does not qualify"}
                      </p>
                    </div>
                  ))}
                  <button
                    className="secondary-button"
                    onClick={() => setMethod(true)}
                  >
                    Explain discovery signal
                  </button>
                </section>
                <SentimentPanel
                  key={listing.id}
                  bundle={headlineToneBundle(
                    listing.evidence,
                    listing.newsRetrievedAt,
                  )}
                  today={today}
                  evaluation={evaluateTone()}
                  threshold={TONE_THRESHOLD}
                />
                <AgentChat
                  key={`agent-${listing.id}`}
                  ctx={realAgentContext(listing, today)}
                  symbol={listing.symbol}
                />
                <section className="chart-panel">
                  <h2>Original disclosures</h2>
                  {!listing.evidence.some(
                    (e) => e.type === "company-disclosure",
                  ) && <p>No verified disclosure is available.</p>}
                  {listing.evidence
                    .filter((e) => e.type === "company-disclosure")
                    .map((e) => (
                      <Evidence key={e.id} e={e} />
                    ))}
                </section>
                <section className="chart-panel">
                  <h2>Recent news headlines</h2>
                  <p className="small muted">
                    Google News search, last 30 days · Retrieved{" "}
                    {listing.newsRetrievedAt || "never"}
                    {listing.newsError
                      ? " · Latest news refresh failed; older headlines may be shown"
                      : ""}
                    . Positive, negative and opinion coverage are not separated.
                  </p>
                  {!listing.evidence.some((e) => e.type === "news-report") && (
                    <p>No company-matched headlines are available.</p>
                  )}
                  {listing.evidence
                    .filter((e) => e.type === "news-report")
                    .map((e) => (
                      <Evidence key={e.id} e={e} />
                    ))}
                </section>
              </>
            ) : (
              <>
                <section className="page-heading">
                  <div className="eyebrow">INDEPENDENT EQUITY RESEARCH</div>
                  <h1>
                    {view === "watchlist"
                      ? "Your watchlist"
                      : "Explore Indian businesses."}
                  </h1>
                  <p>
                    Verified listing coverage and source-linked observations.
                  </p>
                </section>
                {view === "watchlist" && (
                  <button
                    className="secondary-button"
                    onClick={watchlist.clear}
                  >
                    Clear watchlist
                  </button>
                )}
                <section className="universe-section">
                  <div className="section-heading">
                    <h2>
                      {view === "watchlist"
                        ? "Saved listings"
                        : "Explore the universe"}{" "}
                      <span className="result-count">{filtered.length}</span>
                    </h2>
                    <label>
                      Discovery signal{" "}
                      <select
                        aria-label="Discovery signal"
                        value={signalFilter}
                        onChange={(e) => setSignalFilter(e.target.value)}
                      >
                        <option value="all">All signals</option>
                        {SIGNAL_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="filter-row">
                    {[
                      "All sectors",
                      ...[...new Set(listings.map((l) => l.sector))].sort(),
                    ].map((s) => (
                      <button
                        className="filter-chip"
                        key={s}
                        aria-pressed={sector === s}
                        onClick={() => setSector(s)}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      className="text-button"
                      onClick={() => setMethod(true)}
                    >
                      Explain discovery signal
                    </button>
                  </div>
                  {filtered.map((l) => (
                    <article className="chart-panel" key={l.id}>
                      <div className="section-heading">
                        <div>
                          <button
                            className="company-name"
                            onClick={() => {
                              setSelected(l.id);
                              setPeriod("6M");
                            }}
                          >
                            {l.name}
                          </button>
                          <p>
                            {l.symbol} · {l.exchange} · {l.sector}
                          </p>
                        </div>
                        {save(l)}
                      </div>
                      <Quote listing={l} />
                      <ObservedSparkline listing={l} today={today} />
                      <p>
                        {l.signals
                          .filter((s) => s.unit !== "flag" || s.qualifies)
                          .map(signalSummary)
                          .join(" · ")}{" "}
                        · P/E and growth unavailable
                      </p>
                    </article>
                  ))}
                  {!loading && !filtered.length && (
                    <div className="empty-state">
                      <h3>
                        {listings.length
                          ? "No companies match these filters"
                          : "Market data unavailable"}
                      </h3>
                      <p>
                        {listings.length
                          ? "No listing qualifies for the selected signal and filters. Missing data never qualifies."
                          : "The local backend needs a verified listing and successful source acquisition. No substitute prices are shown."}
                      </p>
                      <button
                        className="secondary-button"
                        onClick={() => setRevision((r) => r + 1)}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {view === "watchlist" &&
                    watchlist.ids
                      .filter((id) => !listings.some((l) => l.id === id))
                      .map((id) => (
                        <article className="chart-panel" key={id}>
                          <h3>{id}</h3>
                          <p>
                            Unavailable: listing is outside verified coverage.
                          </p>
                          <button onClick={() => watchlist.toggle(id)}>
                            Remove {id}
                          </button>
                        </article>
                      ))}
                </section>
              </>
            )}
            <footer>
              <span>
                Research, not investment advice. Returns are never guaranteed.
              </span>
              <span>Watchlists stay on this browser.</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
