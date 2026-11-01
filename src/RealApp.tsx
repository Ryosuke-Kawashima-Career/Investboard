import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  ExternalLink,
  FileText,
  Info,
  Leaf,
  Newspaper,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { HeroArt } from "./HeroArt";
import { money } from "./data";
import { summarizePeriod } from "./chart-data";
import { StockChart, describeChange } from "./StockChart";
import { useWatchlist } from "./useWatchlist";
import { SentimentPanel } from "./SentimentPanel";
import { AgentChat } from "./AgentChat";
import { realAgentContext } from "./agent";
import {
  TONE_THRESHOLD,
  classifyHeadline,
  evaluateTone,
  headlineToneBundle,
} from "./tone";
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
  const tone = news ? classifyHeadline(e.title) : null;
  // Tone describes the headline wording only; it is never presented as an
  // opportunity or risk claim about the company.
  return (
    <article
      className={`panel evidence-card ${tone ? `tone-${tone}` : "disclosure"}`}
    >
      <span className="evidence-kind">
        {news ? <Newspaper size={15} /> : <FileText size={15} />}{" "}
        {news ? `${tone} tone` : "Official disclosure"}
      </span>
      <h3>{e.title}</h3>
      {e.summary && <p>{e.summary}</p>}
      <div className="small muted">
        {e.publisher} · {news ? "News headline" : "Company disclosure"}
        {e.syndicatedCopies ? ` · ${e.syndicatedCopies} syndicated copies` : ""}
        <br />
        Published: {e.publishedAt || "Unknown"} · Retrieved: {e.retrievedAt}
      </div>
      {!!e.claimLocations.length && (
        <p className="small">Claim locations: {e.claimLocations.join("; ")}</p>
      )}
      <a
        className="source-link"
        href={e.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {news ? "Open article via Google News" : "Open original disclosure"}{" "}
        <ExternalLink size={14} />
      </a>
      {!news && <p className="evidence-disclaimer">{e.limitations}</p>}
    </article>
  );
}
const disclosures = (l: RealListing) =>
  l.evidence.filter((e) => e.type === "company-disclosure");
const headlines = (l: RealListing) =>
  l.evidence.filter((e) => e.type === "news-report");
const momentum = (l: RealListing) =>
  l.signals.find((s) => s.version === "price-momentum-1m-v1");
const percentText = (v: number | null) =>
  v === null ? "Unavailable" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
/** Short lowercase tile text, matching the demo's logo style. */
const logoText = (l: RealListing) =>
  (l.symbol.length <= 4 ? l.symbol : l.symbol.slice(0, 3)).toLowerCase();
/** Demo-style price with direction text; missing values are never shown as zero. */
function Price({
  listing,
  large = false,
}: {
  listing: RealListing;
  large?: boolean;
}) {
  const q = listing.quote,
    delta =
      q.price !== null && q.previousClose !== null
        ? q.price - q.previousClose
        : null;
  return (
    <div className={`price ${large ? "large" : ""}`}>
      <strong>{q.price === null ? "Unavailable" : money(q.price)}</strong>
      {delta !== null && (
        <span className={delta >= 0 ? "up" : "down"}>
          {delta >= 0 ? "↗ Up" : "↘ Down"} {Math.abs(delta).toFixed(2)} (
          {q.previousClose
            ? ((Math.abs(delta) / q.previousClose) * 100).toFixed(2) + "%"
            : "percentage unavailable"}
          )
        </span>
      )}
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
  const searchRef = useRef<HTMLInputElement>(null),
    dialogRef = useRef<HTMLDialogElement>(null),
    mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  useEffect(() => {
    if (method) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [method]);
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
      className={`icon-button save ${watchlist.ids.includes(l.id) ? "saved" : ""}`}
      aria-label={`${watchlist.ids.includes(l.id) ? "Remove" : "Save"} ${l.symbol} ${l.exchange}`}
      aria-pressed={watchlist.ids.includes(l.id)}
      onClick={() => watchlist.toggle(l.id)}
    >
      <Bookmark
        size={17}
        fill={watchlist.ids.includes(l.id) ? "currentColor" : "none"}
      />
    </button>
  );
  function open(id: string) {
    setSelected(id);
    setPeriod("6M");
    requestAnimationFrame(() => mainRef.current?.focus());
  }
  function navigate(next: string) {
    setView(next);
    setSelected(null);
    setQuery("");
    setSignalFilter("all");
    setSector("All sectors");
  }
  // Alphabetical, never ordered by the size of the move.
  const radar = listings
    .filter((l) => momentum(l)?.qualifies)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 3);
  const backLabel = view === "watchlist" ? "watchlist" : "discover";
  const companyHeading = (l: RealListing) => (
    <div className="company-heading">
      <div className={`company-logo ${l.color}`}>{logoText(l)}</div>
      <div>
        <div className="eyebrow">
          {l.exchange} : {l.symbol} <span>· {l.sector}</span>
        </div>
        <h1>{l.name}</h1>
        <p>{l.description}</p>
      </div>
      <div className="heading-save">{save(l)}</div>
    </div>
  );
  const backButton = (
    <button className="back-button" onClick={() => setSelected(null)}>
      <ArrowLeft size={16} /> Back to {backLabel}
    </button>
  );
  const emptyKind = !listings.length
    ? "unavailable"
    : view === "watchlist" && !watchlist.ids.length
      ? "fresh"
      : "filtered";
  return (
    <div className="macos-app-shell">
      <a href="#main" className="skip-link">
        Skip to research
      </a>
      <div className="macos-framed-canvas app-layout">
        <aside className="sidebar">
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              navigate("discover");
            }}
          >
            <span className="brand-mark">
              <Leaf size={23} />
            </span>
            <span className="brand-name">
              India
              <br />
              Forward
            </span>
          </a>
          <div className="workspace-label">YOUR RESEARCH SPACE</div>
          <nav aria-label="Main navigation">
            <button
              className={`nav-item ${view === "discover" ? "active" : ""}`}
              onClick={() => navigate("discover")}
            >
              <Compass size={18} />
              Discover
              <ChevronRight className="nav-chevron" size={15} />
            </button>
            <button
              className={`nav-item ${view === "watchlist" ? "active" : ""}`}
              onClick={() => navigate("watchlist")}
            >
              <Bookmark size={18} />
              Watchlist<span className="nav-count">{watchlist.ids.length}</span>
            </button>
          </nav>
          <div className="sidebar-note">
            <div className="note-icon">
              <BookOpen size={20} />
            </div>
            <h3>Evidence before instinct.</h3>
            <p>
              Observed prices, linked headlines and explicit coverage. Build
              your own perspective.
            </p>
            <button className="text-button" onClick={() => setMethod(true)}>
              Our research approach <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sidebar-bottom">
            <span className="demo-dot real" /> Real data · local research
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              Workspace <ChevronRight size={13} />
              <span>
                {picked
                  ? picked.symbol
                  : view === "discover"
                    ? "Discover"
                    : "Watchlist"}
              </span>
            </div>
            <div className="search-box">
              <Search size={17} />
              <input
                ref={searchRef}
                aria-label="Search companies or symbols"
                placeholder="Search companies or symbols…"
                maxLength={100}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
              />
              <kbd className="macos-kbd">Ctrl K</kbd>
              {query && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              className="demo-badge real"
              aria-label="About real data"
              onClick={() => setMethod(true)}
            >
              REAL DATA
            </button>
          </header>
          <main id="main" ref={mainRef} tabIndex={-1}>
            <div className="demo-notice">
              <Info size={14} />
              <span>
                {listings.length} verified NSE listings · End-of-day prices
              </span>
              <button onClick={() => setMethod(true)}>
                About this data <ArrowUpRight size={13} />
              </button>
            </div>
            {watchlist.warning && (
              <p role="status" className="storage-warning">
                <AlertTriangle size={16} />
                {watchlist.warning}
              </p>
            )}
            {error && (
              <div role="alert" className="storage-warning">
                <AlertTriangle size={16} />
                <span>
                  Research API unavailable.{" "}
                  {result
                    ? "Last loaded observations remain visible."
                    : "No cached response is available in this browser."}
                </span>
                <button
                  className="secondary-button"
                  onClick={() => setRevision((r) => r + 1)}
                >
                  Retry
                </button>
              </div>
            )}
            {result?.meta.error && (
              <p role="status" className="storage-warning">
                <Info size={15} />
                <span>
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
                </span>
              </p>
            )}
            {picked && !listing ? (
              <>
                {backButton}
                {companyHeading(picked)}
                <section className="detail-loading" aria-live="polite">
                  {full?.error ? (
                    <div className="empty-state">
                      <AlertTriangle size={27} />
                      <h3>Full history and headlines could not be loaded</h3>
                      <p>Nothing is shown in their place.</p>
                      <button
                        className="secondary-button"
                        onClick={() => setDetailRevision((n) => n + 1)}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <span className="loading-spinner" />
                      <h3>Loading full history and headlines…</h3>
                    </div>
                  )}
                </section>
              </>
            ) : listing ? (
              <>
                {backButton}
                {companyHeading(listing)}
                <div className="detail-grid">
                  <section className="panel quote-panel">
                    <div className="section-top">
                      <div>
                        <div className="eyebrow">OBSERVED QUOTE · INR</div>
                        <Price listing={listing} large />
                      </div>
                      <span className="subtle-badge">
                        End-of-day ·{" "}
                        {listing.quote.sourceDate || "no observation"}
                      </span>
                    </div>
                    <p className="muted small">
                      {listing.quote.source} · Retrieved{" "}
                      {listing.quote.fetchedTimestamp?.slice(0, 10) || "never"}
                      {listing.quote.freshness === "stale" ? " · Stale" : ""}
                    </p>
                    <div className="chart-toolbar">
                      <h3>Price history</h3>
                      <div
                        className="macos-segmented-track"
                        aria-label="History period"
                      >
                        {["1M", "6M", "1Y"].map((p) => (
                          <button
                            key={p}
                            aria-pressed={period === p}
                            className={`macos-segmented-btn ${period === p ? "active" : ""}`}
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
                    <p className="small muted coverage-note">
                      {listing.history.length} observed sessions
                      {listing.history[0]?.date > from
                        ? " · Partial history for this range"
                        : ""}
                    </p>
                  </section>
                  <section className="panel fundamentals">
                    <div className="eyebrow">THE BUSINESS AT A GLANCE</div>
                    <h2>Company snapshot</h2>
                    <dl>
                      <div>
                        <dt>Sector</dt>
                        <dd>{listing.sector}</dd>
                      </div>
                      <div>
                        <dt>Market capitalization</dt>
                        <dd>Unavailable</dd>
                      </div>
                      <div>
                        <dt>P/E ratio</dt>
                        <dd>Unavailable</dd>
                      </div>
                      <div>
                        <dt>1-month price change</dt>
                        <dd>{percentText(momentum(listing)?.value ?? null)}</dd>
                      </div>
                    </dl>
                    <button
                      className="source-link text-button"
                      onClick={() => setMethod(true)}
                    >
                      Explain discovery signal <ArrowUpRight size={14} />
                    </button>
                  </section>
                </div>
                {listing.signals.map((s) => (
                  <section
                    className={`panel signal-panel ${s.qualifies ? "" : "quiet"}`}
                    key={s.version}
                  >
                    <div className="signal-icon">
                      <Sparkles size={19} />
                    </div>
                    <div>
                      <div className="eyebrow">
                        {s.qualifies ? "WHY IT APPEARS" : "SIGNAL"} ·{" "}
                        {s.version}
                      </div>
                      <h3>{signalSummary(s)}</h3>
                      <p>{s.definition}</p>
                      <span className="small muted">
                        Period: {s.period} · Source: {s.source} ·{" "}
                        {s.qualifies ? "Qualifies" : "Does not qualify"}
                      </span>
                    </div>
                  </section>
                ))}
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
                  companyId={listing.companyId}
                />
                <div className="section-top evidence-heading">
                  <div>
                    <h2>Original disclosures</h2>
                  </div>
                  <span className="subtle-badge">
                    {disclosures(listing).length} verified
                  </span>
                </div>
                {disclosures(listing).length ? (
                  <div className="evidence-grid">
                    {disclosures(listing).map((e) => (
                      <Evidence key={e.id} e={e} />
                    ))}
                  </div>
                ) : (
                  <p className="muted evidence-empty">
                    No verified disclosure is available.
                  </p>
                )}
                <div className="section-top evidence-heading">
                  <div>
                    <h2>Recent news headlines</h2>
                    <p>
                      Google News · last 30 days
                      {listing.newsError ? " · latest refresh failed" : ""}
                    </p>
                  </div>
                  <span className="subtle-badge">
                    {headlines(listing).length} headlines
                  </span>
                </div>
                {headlines(listing).length ? (
                  <div className="evidence-grid">
                    {headlines(listing).map((e) => (
                      <Evidence key={e.id} e={e} />
                    ))}
                  </div>
                ) : (
                  <p className="muted evidence-empty">
                    No company-matched headlines are available.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      INDIAN EQUITIES, A CLEARER PERSPECTIVE
                    </div>
                    <h1>
                      {view === "watchlist"
                        ? "Your research, together."
                        : "Find your next question."}
                    </h1>
                    <p>
                      {view === "watchlist"
                        ? "A little less noise. A closer look at the companies you save."
                        : "Discover businesses. Follow the evidence. Think independently."}
                    </p>
                  </div>
                  {view === "watchlist" && watchlist.ids.length > 0 && (
                    <button
                      className="secondary-button"
                      onClick={watchlist.clear}
                    >
                      <X size={15} /> Clear watchlist
                    </button>
                  )}
                </div>
                {view === "discover" && !query && listings.length > 0 && (
                  <>
                    <section className="hero">
                      <div className="hero-copy">
                        <span className="eyebrow">
                          <span className="tiny-line" /> A THOUGHTFUL PLACE TO
                          START
                        </span>
                        <h2>
                          Good research grows
                          <br />
                          from a wider perspective.
                        </h2>
                        <p>
                          Look beyond the price. Explore what drives a business,
                          <br className="desktop-break" /> and what might
                          challenge it.
                        </p>
                        <button
                          className="hero-button"
                          onClick={() =>
                            document
                              .getElementById("company-list")
                              ?.scrollIntoView({ behavior: "smooth" })
                          }
                        >
                          Explore companies <ArrowRight size={16} />
                        </button>
                      </div>
                      <HeroArt />
                      <div className="hero-foot">
                        <span>
                          <Check size={13} /> Observed end-of-day prices
                        </span>
                        <span>
                          <Check size={13} /> Linked headlines and their tone
                        </span>
                        <span>
                          <Check size={13} /> No stock tips. Just context.
                        </span>
                      </div>
                    </section>
                    {radar.length > 0 && (
                      <section className="featured-section">
                        <div className="section-top">
                          <div className="inline-heading">
                            <Sparkles size={17} />
                            <h2>On the research radar</h2>
                            <span className="subtle-badge">
                              1-month price change ≥ +5%
                            </span>
                          </div>
                          <button
                            className="text-button"
                            onClick={() => setMethod(true)}
                          >
                            How discovery works <ArrowUpRight size={14} />
                          </button>
                        </div>
                        <div className="featured-grid">
                          {radar.map((l) => (
                            <article className="company-card" key={l.id}>
                              <div className="card-top">
                                <div className={`company-logo ${l.color}`}>
                                  {logoText(l)}
                                </div>
                                <div>
                                  <button
                                    className="company-name"
                                    aria-label={`Open ${l.symbol} from the research radar`}
                                    onClick={() => open(l.id)}
                                  >
                                    {l.name}
                                  </button>
                                  <div className="small muted">
                                    {l.symbol}{" "}
                                    <span className="dot-separator">·</span>{" "}
                                    {l.exchange}
                                  </div>
                                </div>
                                {save(l)}
                              </div>
                              <Price listing={l} />
                              <ObservedSparkline listing={l} today={today} />
                              <button
                                className="signal-strip"
                                aria-label={`Why ${l.symbol} appears`}
                                onClick={() => open(l.id)}
                              >
                                <span>
                                  <BarChart3 size={14} /> 1-month change{" "}
                                  <strong>
                                    {percentText(momentum(l)?.value ?? null)}
                                  </strong>
                                </span>
                                <ArrowUpRight size={14} />
                              </button>
                              <div className="card-foot">
                                <span>{l.sector}</span>
                                <span>EOD · {l.quote.sourceDate || "—"}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
                <section id="company-list" className="universe">
                  <div className="section-top">
                    <div>
                      <h2>
                        {view === "watchlist"
                          ? "Saved companies"
                          : query
                            ? "Search results"
                            : "Explore the universe"}{" "}
                        <span className="result-count">{filtered.length}</span>
                      </h2>
                      <p>
                        {view === "watchlist"
                          ? "Stored on this browser only. Add, remove or clear at any time."
                          : `${listings.length} verified NSE listings · End-of-day observations · Not the full market`}
                      </p>
                    </div>
                    <label className="signal-select">
                      <SlidersHorizontal size={14} />
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
                  <div className="filter-row" aria-label="Sector filters">
                    {[
                      "All sectors",
                      ...[...new Set(listings.map((l) => l.sector))].sort(),
                    ].map((s) => (
                      <button
                        className={`filter-chip ${sector === s ? "active" : ""}`}
                        key={s}
                        aria-pressed={sector === s}
                        onClick={() => setSector(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div aria-live="polite">
                    {loading && !result ? (
                      <div className="empty-state" role="status">
                        <span className="loading-spinner" />
                        <h3>Loading research…</h3>
                      </div>
                    ) : filtered.length ? (
                      <div className="company-table">
                        <div className="table-header">
                          <span>COMPANY / EXCHANGE</span>
                          <span>SECTOR</span>
                          <span>PRICE & DAILY CHANGE</span>
                          <span>LAST MONTH</span>
                          <span>SAVE</span>
                        </div>
                        {filtered.map((l) => (
                          <div className="table-row" key={l.id}>
                            <div className="table-company">
                              <div
                                className={`company-logo small-logo ${l.color}`}
                              >
                                {logoText(l)}
                              </div>
                              <div>
                                <button
                                  className="company-name"
                                  onClick={() => open(l.id)}
                                >
                                  {l.name}
                                </button>
                                <div className="small muted">
                                  {l.symbol} · {l.exchange}
                                </div>
                              </div>
                            </div>
                            <span className="table-sector">{l.sector}</span>
                            <div>
                              <Price listing={l} />
                              <span className="table-freshness">
                                EOD · {l.quote.sourceDate || "No observation"}
                              </span>
                            </div>
                            <div className="table-trend">
                              <ObservedSparkline listing={l} today={today} />
                            </div>
                            {save(l)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      !loading && (
                        <div className="empty-state">
                          <Search size={28} />
                          <h3>
                            {emptyKind === "unavailable"
                              ? "Market data unavailable"
                              : emptyKind === "fresh"
                                ? "A fresh page for your research"
                                : "No companies match these filters"}
                          </h3>
                          <p>
                            {emptyKind === "unavailable"
                              ? "The local backend needs a verified listing and successful source acquisition. No substitute prices are shown."
                              : emptyKind === "fresh"
                                ? "Save a listing with its bookmark button to find it here."
                                : "No listing qualifies for the selected signal and filters. Missing data never qualifies."}
                          </p>
                          <button
                            className="secondary-button"
                            onClick={() => {
                              if (emptyKind === "unavailable")
                                setRevision((r) => r + 1);
                              else if (emptyKind === "fresh")
                                navigate("discover");
                              else {
                                setQuery("");
                                setSector("All sectors");
                                setSignalFilter("all");
                              }
                            }}
                          >
                            {emptyKind === "unavailable"
                              ? "Retry"
                              : emptyKind === "fresh"
                                ? "Discover companies"
                                : "Reset filters"}
                          </button>
                        </div>
                      )
                    )}
                    {view === "watchlist" &&
                      watchlist.ids
                        .filter((id) => !listings.some((l) => l.id === id))
                        .map((id) => (
                          <div className="table-row unsupported-row" key={id}>
                            <div className="table-company">
                              <div className="company-logo small-logo">?</div>
                              <div>
                                <strong>{id}</strong>
                                <div className="small muted">
                                  Unavailable: listing is outside verified
                                  coverage.
                                </div>
                              </div>
                            </div>
                            <button
                              className="secondary-button"
                              onClick={() => watchlist.toggle(id)}
                            >
                              Remove {id}
                            </button>
                          </div>
                        ))}
                  </div>
                  <div className="table-caption">
                    <Info size={13} />
                    <span>
                      Alphabetical order. Signals are research prompts, not
                      rankings or return forecasts.
                    </span>
                    <button
                      className="text-button"
                      onClick={() => setMethod(true)}
                    >
                      Explain discovery signal
                    </button>
                  </div>
                </section>
              </>
            )}
            <footer>
              <span>
                <Leaf size={14} /> Made for independent thinking.
              </span>
              <span>
                Research, not investment advice. Returns are never guaranteed.
                Watchlists stay on this browser.
              </span>
            </footer>
          </main>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        className="methodology-dialog"
        onCancel={() => setMethod(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMethod(false);
        }}
      >
        <div className="dialog-top">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          <button
            className="icon-button"
            aria-label="Close research approach"
            onClick={() => setMethod(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="eyebrow">OUR RESEARCH APPROACH</div>
        <h2>Context over conviction.</h2>
        <p>
          India Forward helps you ask better questions about Indian businesses.
          Discovery is a starting point for independent research, not a buy or
          sell recommendation.
        </p>
        <h3>Explainable signals</h3>
        <p>
          price-momentum-1m-v1 compares the latest close with the last close on
          or before one calendar month earlier; it qualifies at +5% or more.
          Past movement only, never a forecast.
        </p>
        <p>
          news-coverage-7d-v1 counts distinct headlines naming the company,
          published in the last 7 calendar days (Google News search); it
          qualifies at 3 or more. It measures attention, not sentiment: coverage
          may be negative or opinion.
        </p>
        <p>
          recent-disclosure-v1 includes verified official company disclosures
          published within 30 calendar days in Asia/Kolkata, including today.
          Unknown or future dates never qualify. Companies are alphabetical,
          with no forecast or ranking.
        </p>
        <h3>Headline tone and the research agent</h3>
        <p>
          Headline tone classifies the wording of company-matched Google News
          headlines with word lists (headline-lexicon-v1). It describes
          headlines, not public opinion, is not a forecast and never affects
          discovery ranking. Headlines are not checked against the articles.
        </p>
        <p>
          The research agent answers only from the stored prices, signals and
          headlines for the open company, cites them by id, and has no web
          access. When an AI provider key is configured, answers are
          AI-generated and can be wrong; otherwise they are rule-based. It gives
          no advice, targets or forecasts, and conversations are not stored
          after you leave the page.
        </p>
        <h3>Sources and limits</h3>
        <p>
          {listings.length} verified NSE listings with Yahoo Finance end-of-day
          prices (split-adjusted, not dividend-adjusted). Headlines are shown as
          published, without summaries, and are not checked against article
          bodies. P/E, market cap and growth are unavailable until separately
          sourced.
        </p>
        <p className="small muted">
          Watchlists stay on this browser. There are no accounts or brokerage
          connections.
        </p>
        <button className="primary-button" onClick={() => setMethod(false)}>
          Back to research <ArrowRight size={15} />
        </button>
      </dialog>
    </div>
  );
}
