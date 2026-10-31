export type ListingManifest = {
  id: string;
  companyId: string;
  name: string;
  symbol: string;
  exchange: "NSE";
  providerSymbol: string;
  currency: "INR";
  sector: string;
  initials: string;
  color: string;
  description: string;
  aliases: string[];
  source: string;
  sourceUrl: string;
  basis: string;
  identitySource?: string;
  bseCode?: string;
  isin?: string;
};
const listing = (
  symbol: string,
  companyId: string,
  name: string,
  sector: string,
  color: string,
  description: string,
  aliases: string[],
  extra: Partial<ListingManifest> = {},
): ListingManifest => ({
  id: `NSE:${symbol}`,
  companyId,
  name,
  symbol,
  exchange: "NSE",
  providerSymbol: `${symbol}.NS`,
  currency: "INR",
  sector,
  initials: name[0],
  color,
  description,
  aliases: [name.replace(/ Limited$/, ""), ...aliases],
  source: "Yahoo Finance",
  sourceUrl: `https://finance.yahoo.com/quote/${symbol}.NS/history/`,
  basis: "split-adjusted",
  ...extra,
});
// Versioned so a database built for another universe or source is refused.
export const SOURCE_ID = "yahoo-chart-nse-v2";
export const UNIVERSE: ListingManifest[] = [
  listing(
    "RELIANCE",
    "reliance",
    "Reliance Industries Limited",
    "Diversified",
    "blue",
    "Diversified business with energy, retail and digital services operations.",
    ["Reliance", "RIL"],
    {
      identitySource:
        "https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_INDAS_175606_17072026194906_iXBRL_WEB.html",
      bseCode: "500325",
      isin: "INE002A01018",
    },
  ),
  listing(
    "TCS",
    "tcs",
    "Tata Consultancy Services Limited",
    "Information Technology",
    "violet",
    "IT services, consulting and business solutions.",
    ["TCS"],
  ),
  listing(
    "INFY",
    "infosys",
    "Infosys Limited",
    "Information Technology",
    "violet",
    "IT services, consulting and digital transformation.",
    ["Infosys"],
  ),
  listing(
    "HDFCBANK",
    "hdfc-bank",
    "HDFC Bank Limited",
    "Banking",
    "green",
    "Private-sector bank offering retail and wholesale banking.",
    ["HDFC Bank"],
  ),
  listing(
    "ICICIBANK",
    "icici-bank",
    "ICICI Bank Limited",
    "Banking",
    "green",
    "Private-sector bank offering retail and corporate banking.",
    ["ICICI Bank"],
  ),
  listing(
    "HINDUNILVR",
    "hindustan-unilever",
    "Hindustan Unilever Limited",
    "Consumer Goods",
    "orange",
    "Consumer goods across home care, beauty and foods.",
    ["HUL", "Hindustan Unilever"],
  ),
  listing(
    "ITC",
    "itc",
    "ITC Limited",
    "Consumer Goods",
    "orange",
    "Consumer goods, hotels, paperboards and agri-business.",
    ["ITC"],
  ),
  listing(
    "BHARTIARTL",
    "bharti-airtel",
    "Bharti Airtel Limited",
    "Telecom",
    "red",
    "Telecommunications services in India and Africa.",
    ["Airtel", "Bharti Airtel"],
  ),
  listing(
    "LT",
    "larsen-toubro",
    "Larsen & Toubro Limited",
    "Capital Goods",
    "teal",
    "Engineering, construction and technology services.",
    ["L&T", "Larsen & Toubro", "Larsen and Toubro"],
  ),
  listing(
    "SUNPHARMA",
    "sun-pharma",
    "Sun Pharmaceutical Industries Limited",
    "Pharmaceuticals",
    "pink",
    "Specialty and generic pharmaceuticals.",
    ["Sun Pharma", "Sun Pharmaceutical"],
  ),
];
export const manifest = UNIVERSE[0];
export function findListing(id: string) {
  return UNIVERSE.find((l) => l.id === id);
}
export function indiaDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function normalizeDaily(
  raw: any,
  now = new Date(),
  listing: ListingManifest = manifest,
) {
  const result = raw?.chart?.result?.[0],
    meta = result?.meta;
  if (
    raw?.chart?.error ||
    !meta ||
    meta.symbol !== listing.providerSymbol ||
    meta.currency !== "INR" ||
    meta.exchangeName !== "NSI" ||
    meta.instrumentType !== "EQUITY" ||
    meta.exchangeTimezoneName !== "Asia/Kolkata" ||
    (meta.longName || "").toLowerCase() !== listing.name.toLowerCase()
  )
    throw new Error("PROVIDER_IDENTITY_MISMATCH");
  const times = result.timestamp,
    q = result.indicators?.quote?.[0];
  if (
    !Array.isArray(times) ||
    times.length > 10000 ||
    !q ||
    !Array.isArray(q.close) ||
    q.close.length !== times.length
  )
    throw new Error("INVALID_DAILY_SERIES");
  for (const field of ["open", "high", "low", "volume"])
    if (
      q[field] !== undefined &&
      (!Array.isArray(q[field]) || q[field].length !== times.length)
    )
      throw new Error("INVALID_DAILY_SERIES");
  const seen = new Set<string>(),
    points = [];
  for (let i = 0; i < times.length; i++) {
    if (!Number.isSafeInteger(times[i]) || times[i] <= 0)
      throw new Error("INVALID_SOURCE_TIMESTAMP");
    const date = indiaDate(new Date(times[i] * 1000));
    if (!validDate(date) || seen.has(date))
      throw new Error("INVALID_OR_DUPLICATE_DATE");
    seen.add(date);
    // Never label an unfinished current-session candle as an end-of-day observation.
    if (date >= indiaDate(now)) continue;
    if (q.close[i] === null) continue; // Explicit provider gaps are not observations.
    const close = q.close[i];
    if (typeof close !== "number" || !Number.isFinite(close) || close <= 0)
      throw new Error("INVALID_PRICE");
    const values = ["open", "high", "low"].map((k) => q[k]?.[i]);
    const full = values.every((v) => v !== null && v !== undefined);
    if (
      values.some(
        (v) =>
          v !== null &&
          v !== undefined &&
          (typeof v !== "number" || !Number.isFinite(v) || v <= 0),
      )
    )
      throw new Error("INVALID_OHLC");
    const [open, high, low] = full ? values : [undefined, undefined, undefined];
    if (full && (low > Math.min(open, close) || high < Math.max(open, close)))
      throw new Error("INVALID_OHLC");
    const volume = q.volume?.[i] ?? undefined;
    if (volume !== undefined && (!Number.isSafeInteger(volume) || volume < 0))
      throw new Error("INVALID_VOLUME");
    points.push({
      date,
      open,
      high,
      low,
      close,
      volume,
      currency: "INR",
      source: listing.source,
      basis: listing.basis,
    });
  }
  if (points.length < 22) throw new Error("INSUFFICIENT_HISTORY");
  return points.sort((a, b) => a.date.localeCompare(b.date));
}
export function calendarFrom(today: string, period: string) {
  const d = new Date(today + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(
    d.getUTCMonth() - (period === "1M" ? 1 : period === "6M" ? 6 : 12),
  );
  const end = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, end));
  return d.toISOString().slice(0, 10);
}
export function discovery(
  evidence: any[],
  now = new Date(),
  companyId = manifest.companyId,
) {
  const asOf = indiaDate(now);
  const start = new Date(asOf);
  start.setUTCDate(start.getUTCDate() - 29);
  const from = start.toISOString().slice(0, 10);
  evidence = [...new Map(evidence.map((e) => [e.id, e])).values()];
  const eligible = evidence.filter(
    (e) =>
      e.companyId === companyId &&
      e.verifiedAt &&
      e.type === "company-disclosure" &&
      validDate(e.publishedAt) &&
      e.publishedAt >= from &&
      e.publishedAt <= asOf,
  );
  return {
    name: "Recent official disclosure",
    version: "recent-disclosure-v1",
    value: eligible.length ? 1 : null,
    qualifies: eligible.length > 0,
    unit: "flag",
    source: "Curated official company disclosures",
    period: `${from} through ${asOf} · Asia/Kolkata`,
    asOf,
    definition:
      "Verified official company disclosure published in the 30 calendar days ending on the as-of date in Asia/Kolkata. Not a growth score or return prediction.",
    evidenceIds: eligible.map((e) => e.id),
    exclusions: evidence
      .filter((e) => e.type === "company-disclosure" && !eligible.includes(e))
      .map((e) => ({
        id: e.id,
        reason: !e.publishedAt
          ? "Publication date unknown"
          : e.publishedAt > asOf
            ? "Future publication"
            : "Outside window or unverified",
      })),
  };
}
export const MOMENTUM_THRESHOLD = 5;
export function momentum(history: any[], listing: ListingManifest = manifest) {
  const latest = history.at(-1);
  const from = latest ? calendarFrom(latest.date, "1M") : null;
  const base = from ? history.filter((p) => p.date <= from).at(-1) : undefined;
  const value =
    latest && base
      ? Math.round(((latest.close - base.close) / base.close) * 10000) / 100
      : null;
  return {
    name: "1-month price change",
    version: "price-momentum-1m-v1",
    value,
    qualifies: value !== null && value >= MOMENTUM_THRESHOLD,
    unit: "percent",
    source: `${listing.source} daily closes (${listing.basis})`,
    period:
      latest && base
        ? `${base.date} close to ${latest.date} close`
        : "Unavailable",
    asOf: latest?.date ?? null,
    definition: `(Latest close / last close on or before one calendar month earlier − 1) × 100. Qualifies at ≥ +${MOMENTUM_THRESHOLD}%. Past price movement only; not a forecast or recommendation.`,
    evidenceIds: [],
    exclusions:
      value === null
        ? [{ id: listing.id, reason: "Insufficient price history" }]
        : [],
  };
}
export const NEWS_THRESHOLD = 3;
export function newsCoverage(
  evidence: any[],
  now = new Date(),
  companyId = manifest.companyId,
) {
  const asOf = indiaDate(now);
  const start = new Date(asOf);
  start.setUTCDate(start.getUTCDate() - 6);
  const from = start.toISOString().slice(0, 10);
  const eligible = evidence.filter(
    (e) =>
      e.companyId === companyId &&
      e.type === "news-report" &&
      validDate(e.publishedAt) &&
      e.publishedAt >= from &&
      e.publishedAt <= asOf,
  );
  return {
    name: "Recent news coverage",
    version: "news-coverage-7d-v1",
    value: eligible.length,
    qualifies: eligible.length >= NEWS_THRESHOLD,
    unit: "headlines",
    source: "Google News RSS search (headlines only)",
    period: `${from} through ${asOf} · Asia/Kolkata`,
    asOf,
    definition: `Distinct company-matched headlines published in the 7 calendar days ending on the as-of date. Qualifies at ≥ ${NEWS_THRESHOLD}. Measures attention, not sentiment; coverage may be positive, negative or opinion.`,
    evidenceIds: eligible.map((e) => e.id),
    exclusions: [],
  };
}
export const SIGNAL_VERSIONS = [
  "price-momentum-1m-v1",
  "news-coverage-7d-v1",
  "recent-disclosure-v1",
];
export function signals(
  listing: ListingManifest,
  history: any[],
  evidence: any[],
  now = new Date(),
) {
  return [
    momentum(history, listing),
    newsCoverage(evidence, now, listing.companyId),
    discovery(evidence, now, listing.companyId),
  ];
}
