import RealApp from "./RealApp";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  ExternalLink,
  Info,
  Leaf,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  BarChart3,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { change, listings, money, sectors, type Listing } from "./data";
import { useWatchlist } from "./useWatchlist";
import { StockChart } from "./StockChart";
import { SentimentPanel } from "./SentimentPanel";
import { AgentChat } from "./AgentChat";
import "./macos-design-system.css";
import "./styles.css";
function Price({
  listing,
  large = false,
}: {
  listing: Listing;
  large?: boolean;
}) {
  const movement = change(listing.quote);
  return (
    <div className={`price ${large ? "large" : ""}`}>
      <strong>
        {listing.quote.price === null
          ? "Unavailable"
          : money(listing.quote.price)}
      </strong>
      {movement && (
        <span className={movement.absolute >= 0 ? "up" : "down"}>
          {movement.absolute >= 0 ? "↗ Up" : "↘ Down"}{" "}
          {Math.abs(movement.absolute).toFixed(2)} (
          {movement.percent === null
            ? "percentage unavailable"
            : `${Math.abs(movement.percent).toFixed(2)}%`}
          )
        </span>
      )}
    </div>
  );
}
function Chart({
  listing,
  full = false,
  period = "6M",
}: {
  listing: Listing;
  full?: boolean;
  period?: string;
}) {
  const count = period === "1M" ? 22 : period === "6M" ? 130 : 260;
  const points = listing.history.slice(-count);
  const values = points.map((p) => p.close),
    min = Math.min(...values) * 0.99,
    max = Math.max(...values) * 1.01;
  const width = 700,
    height = full ? 220 : 66;
  const coords = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * width},${height - ((v - min) / (max - min)) * height}`,
    )
    .join(" ");
  const id = `fill-${listing.id.replace(":", "")}-${full}`;
  return (
    <svg
      className={full ? "chart-full" : "sparkline"}
      viewBox={`0 0 ${width} ${height + 5}`}
      role="img"
      aria-label={`${listing.name} synthetic ${period} price history, INR, unadjusted`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#36876a" stopOpacity=".16" />
          <stop offset="1" stopColor="#36876a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {full &&
        [0, 1, 2, 3].map((n) => (
          <line
            key={n}
            x1="0"
            x2={width}
            y1={(n * height) / 3}
            y2={(n * height) / 3}
            stroke="#e9edeb"
            strokeDasharray="4 5"
          />
        ))}
      <polygon
        points={`0,${height} ${coords} ${width},${height}`}
        fill={`url(#${id})`}
      />
      <polyline
        points={coords}
        stroke="#36876a"
        strokeWidth={full ? 2.5 : 2}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
function App() {
  const [view, setView] = useState<"discover" | "watchlist">("discover");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All sectors");
  const [signal, setSignal] = useState("All signals");
  const [period, setPeriod] = useState("6M");
  const [methodology, setMethodology] = useState(false);
  const [state, setState] = useState<"ready" | "loading" | "error" | "partial">(
    "ready",
  );
  const watchlist = useWatchlist();
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      clearTimeout(retryTimer.current);
    };
  }, []);
  useEffect(() => {
    if (methodology) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [methodology]);
  function open(listing: Listing) {
    setSelected(listing);
    setPeriod("6M");
    requestAnimationFrame(() => mainRef.current?.focus());
  }
  function navigate(next: typeof view) {
    setView(next);
    setSelected(null);
    setQuery("");
    setSector("All sectors");
    setSignal("All signals");
  }
  const filtered = listings
    .filter(
      (l) =>
        (view !== "watchlist" || watchlist.ids.includes(l.id)) &&
        (sector === "All sectors" || l.sector === sector) &&
        (signal === "All signals" ||
          (l.signal.value !== null && l.signal.value >= 10)) &&
        `${l.name} ${l.symbol} ${l.exchange}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || b.exchange.localeCompare(a.exchange),
    );
  const featured = listings.filter(
    (l) => l.exchange === "NSE" && ["TCS", "HDFCBANK", "LT"].includes(l.symbol),
  );
  const save = (l: Listing) => (
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
              className={view === "discover" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("discover")}
            >
              <Compass size={18} />
              Discover
              <ChevronRight className="nav-chevron" size={15} />
            </button>
            <button
              className={view === "watchlist" ? "nav-item active" : "nav-item"}
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
              Understand the business. Explore the evidence. Build your own
              perspective.
            </p>
            <button
              className="text-button"
              onClick={() => setMethodology(true)}
            >
              Our research approach <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sidebar-bottom">
            <span className="demo-dot" /> Frontend demo{" "}
            <span className="version">v0.1</span>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              Workspace <ChevronRight size={13} />
              <span>
                {selected
                  ? selected.symbol
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
              className="demo-badge"
              aria-label="About synthetic demo"
              onClick={() => setMethodology(true)}
            >
              SYNTHETIC DATA
            </button>
          </header>
          <main id="main" ref={mainRef} tabIndex={-1}>
            <div className="demo-notice">
              <Info size={14} />
              <span>
                A space to explore. All prices, charts and research notes are
                synthetic demo data.
              </span>
              <button onClick={() => setMethodology(true)}>
                About this demo <ArrowUpRight size={13} />
              </button>
            </div>
            {watchlist.warning && (
              <p className="storage-warning" role="status">
                <AlertTriangle size={16} />
                {watchlist.warning}
              </p>
            )}
            {selected ? (
              <>
                <button
                  className="back-button"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft size={16} /> Back to {view}
                </button>
                <div className="company-heading">
                  <div className={`company-logo ${selected.color}`}>
                    {selected.initials}
                  </div>
                  <div>
                    <div className="eyebrow">
                      {selected.exchange} : {selected.symbol}{" "}
                      <span>· {selected.sector}</span>
                    </div>
                    <h1>{selected.name}</h1>
                    <p>{selected.description}</p>
                  </div>
                  <div className="heading-save">{save(selected)}</div>
                </div>
                <div className="detail-grid">
                  <section className="panel quote-panel">
                    <div className="section-top">
                      <div>
                        <div className="eyebrow">SYNTHETIC QUOTE · INR</div>
                        <Price listing={selected} large />
                      </div>
                      <span className="subtle-badge">
                        Demo · end-of-day scenario
                      </span>
                    </div>
                    <p className="muted small">
                      Source: {selected.quote.source} · 30 Oct 2026, 3:30 PM IST
                      <br />
                      Retrieved: 30 Oct 2026, 3:30 PM IST · Not a current market
                      quote
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
                    <StockChart listing={selected} period={period} />
                  </section>
                  <section className="panel fundamentals">
                    <div className="eyebrow">THE BUSINESS AT A GLANCE</div>
                    <h2>Company snapshot</h2>
                    <dl>
                      <div>
                        <dt>Sector</dt>
                        <dd>{selected.sector}</dd>
                      </div>
                      <div>
                        <dt>Market capitalization</dt>
                        <dd>
                          {selected.marketCap
                            ? `₹${selected.marketCap}`
                            : "Unavailable"}
                        </dd>
                      </div>
                      <div>
                        <dt>P/E ratio</dt>
                        <dd>{selected.pe ?? "Unavailable"}</dd>
                      </div>
                      <div>
                        <dt>Revenue growth</dt>
                        <dd>
                          {selected.signal.value === null
                            ? "Unavailable"
                            : `${selected.signal.value}%`}
                        </dd>
                      </div>
                    </dl>
                    <p className="small muted">
                      FY2026 · India Forward synthetic fixtures. These values
                      are illustrative, not reported financials.
                    </p>
                    <a
                      className="source-link"
                      href={selected.evidence[0].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Company investor relations <ExternalLink size={14} />
                    </a>
                  </section>
                </div>
                <section className="panel signal-panel">
                  <div className="signal-icon">
                    <Sparkles size={19} />
                  </div>
                  <div>
                    <div className="eyebrow">
                      WHY IT APPEARS · {selected.signal.version}
                    </div>
                    <h3>
                      {selected.signal.value === null
                        ? "No growth signal available"
                        : `${selected.signal.value}% illustrative revenue growth`}
                    </h3>
                    <p>{selected.signal.definition}</p>
                    <span className="small muted">
                      Period: {selected.signal.period} · Source: India Forward
                      synthetic fixtures · Evidence reference:{" "}
                      {selected.signal.evidenceIds.join(", ")}
                    </span>
                  </div>
                </section>
                <SentimentPanel
                  key={selected.id}
                  listingId={selected.id}
                  today="2026-10-30"
                />
                <AgentChat
                  key={selected.id}
                  listing={selected}
                  today="2026-10-30"
                />
                <div className="section-top evidence-heading">
                  <div>
                    <h2>Two sides of the story</h2>
                    <p>Explore the context. Keep the counterpoint in view.</p>
                  </div>
                  <span className="subtle-badge">2 illustrative notes</span>
                </div>
                <div className="evidence-grid">
                  {selected.evidence.map((e) => (
                    <article
                      className={`panel evidence-card ${e.kind}`}
                      key={e.id}
                    >
                      <span className="evidence-kind">
                        {e.kind === "risk" ? (
                          <AlertTriangle size={15} />
                        ) : (
                          <ArrowUpRight size={15} />
                        )}{" "}
                        {e.kind === "risk"
                          ? "The counterpoint"
                          : "Worth exploring"}
                      </span>
                      <h3>{e.title}</h3>
                      <p>{e.summary}</p>
                      <div className="small muted">
                        {e.publisher} · Synthetic
                        <br />
                        Publication date unavailable · Retrieved 30 Oct 2026,
                        3:30 PM IST
                      </div>
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                        className="source-link"
                      >
                        Visit company disclosures <ExternalLink size={14} />
                      </a>
                      <p className="evidence-disclaimer">
                        Destination is a real investor-relations page, not
                        evidence for this fictional note. Verified reporting is
                        not connected.
                      </p>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      INDIAN EQUITIES, A CLEARER PERSPECTIVE
                    </div>
                    <h1>
                      {view === "discover"
                        ? "Find your next question."
                        : "Your research, together."}
                    </h1>
                    <p>
                      {view === "discover"
                        ? "Discover businesses. Follow the evidence. Think independently."
                        : "A little less noise. A closer look at the companies you save."}
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
                {view === "discover" && !query && (
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
                      <div className="hero-art" aria-hidden="true">
                        <svg viewBox="0 0 350 230">
                          <defs>
                            <linearGradient
                              id="leaf"
                              x1="0"
                              y1="0"
                              x2="1"
                              y2="1"
                            >
                              <stop stopColor="#bfd4bb" />
                              <stop offset="1" stopColor="#6b997c" />
                            </linearGradient>
                          </defs>
                          <ellipse
                            cx="180"
                            cy="208"
                            rx="108"
                            ry="12"
                            fill="#c9d8c2"
                            opacity=".35"
                          />
                          <path
                            d="M175 203C175 147 182 99 213 48"
                            fill="none"
                            stroke="#638b71"
                            strokeWidth="3"
                          />
                          <path
                            d="M180 152C120 165 84 112 95 83C143 80 181 105 180 152Z"
                            fill="url(#leaf)"
                          />
                          <path
                            d="M187 121C241 130 280 89 270 59C222 54 193 78 187 121Z"
                            fill="#a7c5a2"
                          />
                          <path
                            d="M206 62C181 47 189 14 220 9C241 33 231 54 206 62Z"
                            fill="#80a98a"
                          />
                          <path
                            d="M179 151L110 97M189 120L256 72"
                            stroke="#729a76"
                            strokeWidth="1.2"
                            fill="none"
                          />
                          <rect
                            x="56"
                            y="162"
                            width="60"
                            height="41"
                            rx="7"
                            fill="#ffffff"
                            opacity=".65"
                            transform="rotate(-8 86 182)"
                          />
                          <path
                            d="M67 189L77 180L86 184L103 169"
                            stroke="#6f9475"
                            strokeWidth="2"
                            fill="none"
                          />
                          <circle
                            cx="276"
                            cy="157"
                            r="21"
                            fill="#ffffff"
                            opacity=".55"
                          />
                          <path
                            d="M267 158L274 164L285 151"
                            fill="none"
                            stroke="#719775"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                      <div className="hero-foot">
                        <span>
                          <Check size={13} /> Evidence-led discovery
                        </span>
                        <span>
                          <Check size={13} /> Opportunities & counterpoints
                        </span>
                        <span>
                          <Check size={13} /> No stock tips. Just context.
                        </span>
                      </div>
                    </section>
                    <section className="featured-section">
                      <div className="section-top">
                        <div className="inline-heading">
                          <Sparkles size={17} />
                          <h2>On the research radar</h2>
                          <span className="subtle-badge">
                            Illustrative signals
                          </span>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setMethodology(true)}
                        >
                          How discovery works <ArrowUpRight size={14} />
                        </button>
                      </div>
                      <div className="featured-grid">
                        {featured.map((l) => (
                          <article className="company-card" key={l.id}>
                            <div className="card-top">
                              <div className={`company-logo ${l.color}`}>
                                {l.initials}
                              </div>
                              <div>
                                <button
                                  className="company-name"
                                  onClick={() => open(l)}
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
                            <Chart listing={l} />
                            <button
                              className="signal-strip"
                              onClick={() => open(l)}
                            >
                              <span>
                                <BarChart3 size={14} /> Revenue growth{" "}
                                <strong>{l.signal.value}%</strong>
                              </span>
                              <ArrowUpRight size={14} />
                            </button>
                            <div className="card-foot">
                              <span>{l.sector}</span>
                              <span>Demo · 30 Oct</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
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
                          : "5 companies · 6 exchange listings · Synthetic coverage, not the full market"}
                      </p>
                    </div>
                    <label className="signal-select">
                      <SlidersHorizontal size={14} />
                      <select
                        aria-label="Discovery signal"
                        value={signal}
                        onChange={(e) => setSignal(e.target.value)}
                      >
                        <option>All signals</option>
                        <option>Revenue growth ≥ 10%</option>
                      </select>
                    </label>
                  </div>
                  <div className="filter-row" aria-label="Sector filters">
                    {sectors.map((s) => (
                      <button
                        className={`filter-chip ${sector === s ? "active" : ""}`}
                        aria-pressed={sector === s}
                        key={s}
                        onClick={() => setSector(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div aria-live="polite">
                    {state === "loading" ? (
                      <div className="empty-state">
                        <span className="loading-spinner" />
                        <h3>Loading demo companies…</h3>
                      </div>
                    ) : state === "error" ? (
                      <div className="empty-state">
                        <AlertTriangle size={27} />
                        <h3>Demo data couldn’t be loaded</h3>
                        <p>Try loading the local fixtures again.</p>
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setState("loading");
                            retryTimer.current = setTimeout(
                              () => setState("ready"),
                              400,
                            );
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <>
                        {state === "partial" && (
                          <p className="storage-warning">
                            <Info size={15} />
                            Partial-data demo: unavailable fundamentals are
                            shown for Tata Consumer Products. Known quotes
                            remain synthetic.
                          </p>
                        )}
                        {filtered.length ? (
                          <div className="company-table">
                            <div className="table-header">
                              <span>COMPANY / EXCHANGE</span>
                              <span>SECTOR</span>
                              <span>PRICE & DAILY CHANGE</span>
                              <span>REVENUE GROWTH</span>
                              <span>SAVE</span>
                            </div>
                            {filtered.map((l) => (
                              <div className="table-row" key={l.id}>
                                <div className="table-company">
                                  <div
                                    className={`company-logo small-logo ${l.color}`}
                                  >
                                    {l.initials}
                                  </div>
                                  <div>
                                    <button
                                      className="company-name"
                                      onClick={() => open(l)}
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
                                    Demo · 30 Oct 2026
                                  </span>
                                </div>
                                <span className="table-growth">
                                  {l.signal.value === null ? (
                                    <span className="muted">Unavailable</span>
                                  ) : (
                                    <>
                                      {l.signal.value}%{" "}
                                      <span className="small muted">
                                        FY26 demo
                                      </span>
                                    </>
                                  )}
                                </span>
                                {save(l)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <Search size={28} />
                            <h3>
                              {view === "watchlist" && !watchlist.ids.length
                                ? "A fresh page for your research"
                                : "No companies match these filters"}
                            </h3>
                            <p>
                              {view === "watchlist" && !watchlist.ids.length
                                ? "Save a listing with its bookmark button to find it here."
                                : "Try another name, symbol, exchange or sector."}
                            </p>
                            <button
                              className="secondary-button"
                              onClick={() => {
                                if (
                                  view === "watchlist" &&
                                  !watchlist.ids.length
                                )
                                  navigate("discover");
                                else {
                                  setQuery("");
                                  setSector("All sectors");
                                  setSignal("All signals");
                                }
                              }}
                            >
                              {view === "watchlist" && !watchlist.ids.length
                                ? "Discover companies"
                                : "Reset filters"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="table-caption">
                    <Info size={13} />
                    <span>
                      Alphabetical order. Signals are research prompts, not
                      rankings or return forecasts.
                    </span>
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
              </span>
            </footer>
          </main>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        className="methodology-dialog"
        onCancel={() => setMethodology(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMethodology(false);
        }}
      >
        <div className="dialog-top">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          <button
            className="icon-button"
            aria-label="Close research approach"
            onClick={() => setMethodology(false)}
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
        <h3>A deliberately small demo</h3>
        <p>
          5 companies and 6 distinct NSE/BSE listings. Every quote, history
          point, growth value and research note is synthetic. No provider or
          verified news feed is connected.
        </p>
        <h3>Explainable by design</h3>
        <p>
          Revenue growth demo-v1 = (current annual revenue ÷ previous annual
          revenue − 1) × 100, FY2026 versus FY2025. The growth filter includes
          values ≥ 10%; missing values are excluded. Listings are alphabetical.
          Risk notes sit beside opportunities.
        </p>
        <h3>Explore interface states</h3>
        <label className="state-label">
          Company list state
          <select
            aria-label="Demo data state"
            value={state}
            onChange={(e) => setState(e.target.value as typeof state)}
          >
            <option value="ready">Ready</option>
            <option value="loading">Loading</option>
            <option value="error">Error with retry</option>
            <option value="partial">Partial data</option>
          </select>
        </label>
        <p className="small muted">
          Watchlists stay on this browser. There are no accounts or brokerage
          connections. Real data permissions and regulatory review belong to the
          later launch milestone.
        </p>
        <button
          className="primary-button"
          onClick={() => setMethodology(false)}
        >
          Back to research <ArrowRight size={15} />
        </button>
      </dialog>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {new URLSearchParams(location.search).get("mode") === "demo" ||
    import.meta.env.VITE_DATA_MODE === "demo" ? (
      <App />
    ) : (
      <RealApp />
    )}
  </React.StrictMode>,
);
