export type Exchange = "NSE" | "BSE";
export interface Quote {
  price: number | null;
  previousClose: number | null;
  currency: "INR";
  source: string;
  sourceTimestamp: string;
  fetchedTimestamp: string;
  delivery: "synthetic";
  freshness: "demo" | "unavailable";
}
export interface HistoryPoint {
  open?: number;
  high?: number;
  low?: number;
  date: string;
  close: number;
  currency: "INR";
  source: string;
  basis: "unadjusted" | "split-adjusted";
}
export interface Evidence {
  id: string;
  companyId: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  retrievedAt: string;
  summary: string;
  kind: "opportunity" | "risk";
  coverage: "synthetic";
}
export interface Signal {
  name: string;
  version: "demo-v1";
  value: number | null;
  period: string;
  definition: string;
  evidenceIds: string[];
}
export interface Listing {
  id: string;
  companyId: string;
  name: string;
  symbol: string;
  exchange: Exchange;
  sector: string;
  initials: string;
  color: string;
  description: string;
  quote: Quote;
  history: HistoryPoint[];
  evidence: Evidence[];
  signal: Signal;
  pe: number | null;
  marketCap: string | null;
}
const timestamp = "2026-10-30T15:30:00+05:30";
const companies = [
  {
    name: "Tata Consultancy Services",
    symbol: "TCS",
    sector: "Technology",
    initials: "tcs",
    color: "violet",
    price: 4126.8,
    previous: 4068.5,
    growth: 7.2,
    pe: 29.4,
    cap: "14.93L Cr",
    description:
      "IT services, consulting and business solutions for global enterprises.",
    opportunity: "Recurring services support revenue visibility",
    risk: "Discretionary technology spending remains a risk",
    url: "https://www.tcs.com/investor-relations",
  },
  {
    name: "HDFC Bank",
    symbol: "HDFCBANK",
    sector: "Financials",
    initials: "H",
    color: "blue",
    price: 1734.25,
    previous: 1745.9,
    growth: 10.4,
    pe: 18.6,
    cap: "13.24L Cr",
    description:
      "Banking and financial services for retail customers and businesses.",
    opportunity: "Deposit growth adds a research starting point",
    risk: "Funding costs may pressure lending margins",
    url: "https://www.hdfcbank.com/personal/about-us/investor-relations",
  },
  {
    name: "Larsen & Toubro",
    symbol: "LT",
    sector: "Industrials",
    initials: "L&T",
    color: "ochre",
    price: 3628.4,
    previous: 3561.2,
    growth: 15.6,
    pe: 31.2,
    cap: "4.99L Cr",
    description:
      "Engineering, construction and manufacturing across infrastructure and energy.",
    opportunity: "Infrastructure activity supports order visibility",
    risk: "Project execution and working capital need attention",
    url: "https://investors.larsentoubro.com/",
  },
  {
    name: "Sun Pharmaceutical",
    symbol: "SUNPHARMA",
    sector: "Healthcare",
    initials: "S",
    color: "coral",
    price: 1782.6,
    previous: 1763.4,
    growth: 9.1,
    pe: 34.8,
    cap: "4.28L Cr",
    description:
      "Specialty and generic medicines serving Indian and international markets.",
    opportunity: "Specialty medicines offer a growth research angle",
    risk: "Regulatory inspections can affect market access",
    url: "https://sunpharma.com/investors/",
  },
  {
    name: "Tata Consumer Products",
    symbol: "TATACONSUM",
    sector: "Consumer",
    initials: "T",
    color: "teal",
    price: 1084.3,
    previous: 1092.6,
    growth: null,
    pe: null,
    cap: null,
    description:
      "Consumer products across branded tea, coffee, foods and beverages.",
    opportunity: "Evidence is insufficient to calculate a growth signal",
    risk: "Input costs and integration expenses need review",
    url: "https://www.tataconsumer.com/investors",
  },
];
export const listings: Listing[] = companies.flatMap((c, i) =>
  (i === 0 ? (["NSE", "BSE"] as const) : (["NSE"] as const)).map((exchange) => {
    const companyId = c.symbol.toLowerCase();
    const history = Array.from({ length: 365 }, (_, n) => {
      const date = new Date(Date.UTC(2025, 9, 31 + n));
      return {
        date: date.toISOString().slice(0, 10),
        close:
          Math.round(
            c.price *
              (0.83 +
                n / 1300 +
                Math.sin(n * 0.31 + i) * 0.022 +
                Math.cos(n * 0.71) * 0.009) *
              100,
          ) / 100,
        currency: "INR" as const,
        source: "India Forward synthetic fixtures",
        basis: "unadjusted" as const,
      };
    })
      .filter((p) => ![0, 6].includes(new Date(p.date).getUTCDay()))
      .map((point, n, observations) => {
        // These intraday values are deterministic synthetic fixtures, never inferred market data.
        const round = (value: number) => Math.round(value * 100) / 100;
        const close =
          n === observations.length - 2
            ? c.previous
            : round((point.close * c.price) / observations.at(-1)!.close);
        const open = round(close * (1 + Math.sin(n * 1.7 + i) * 0.012));
        return {
          ...point,
          close,
          open,
          high: round(
            Math.max(open, close) * (1.003 + Math.abs(Math.sin(n)) * 0.006),
          ),
          low: round(
            Math.min(open, close) * (0.997 - Math.abs(Math.cos(n)) * 0.006),
          ),
        };
      });
    return {
      id: `${exchange}:${c.symbol}`,
      companyId,
      name: c.name,
      symbol: c.symbol,
      exchange,
      sector: c.sector,
      initials: c.initials,
      color: c.color,
      description: c.description,
      quote: {
        price: c.price,
        previousClose: c.previous,
        currency: "INR",
        source: "India Forward synthetic fixtures",
        sourceTimestamp: timestamp,
        fetchedTimestamp: timestamp,
        delivery: "synthetic",
        freshness: "demo",
      },
      history,
      pe: c.pe,
      marketCap: c.cap,
      signal: {
        name: "Revenue growth",
        version: "demo-v1",
        value: c.growth,
        period: "FY2026 vs FY2025 · synthetic",
        definition:
          "(Current annual revenue / previous annual revenue − 1) × 100. Demo values are illustrative; missing values are excluded from signal filters. Companies are ordered alphabetically, never ranked by expected returns.",
        evidenceIds: [`${companyId}-opportunity`],
      },
      evidence: (["opportunity", "risk"] as const).map((kind) => ({
        id: `${companyId}-${kind}`,
        companyId,
        title: kind === "opportunity" ? c.opportunity : c.risk,
        publisher: "India Forward illustrative research note",
        url: c.url,
        publishedAt: null,
        retrievedAt: timestamp,
        summary:
          kind === "opportunity"
            ? `Synthetic scenario for ${c.name}. This is a demonstration of how a company-linked observation would appear. It is not a verified business development.`
            : `Illustrative risk for ${c.name}. Review company disclosures, financial statements and competing evidence before forming a view.`,
        kind,
        coverage: "synthetic" as const,
      })),
    };
  }),
);
export const sectors = [
  "All sectors",
  "Technology",
  "Financials",
  "Industrials",
  "Healthcare",
  "Consumer",
];
export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
export function change(quote: Quote) {
  return quote.price === null || quote.previousClose === null
    ? null
    : {
        absolute: quote.price - quote.previousClose,
        percent:
          quote.previousClose === 0
            ? null
            : ((quote.price - quote.previousClose) / quote.previousClose) * 100,
      };
}
