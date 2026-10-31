import type { Listing } from "./data";
export interface RealListing extends Omit<
  Listing,
  "quote" | "evidence" | "signal"
> {
  verified: boolean;
  quote: Omit<
    Listing["quote"],
    "delivery" | "freshness" | "sourceTimestamp" | "fetchedTimestamp"
  > & {
    delivery: "end-of-day";
    freshness: string;
    sourceTimestamp: null;
    sourceDate: string | null;
    fetchedTimestamp: string | null;
    cacheStatus: string;
  };
  evidence: {
    id: string;
    title: string;
    url: string;
    publisher: string;
    summary: string | null;
    publishedAt: string | null;
    retrievedAt: string;
    verifiedAt: string | null;
    claimLocations: string[];
    limitations: string;
    acquisition: string;
    type: "company-disclosure" | "news-report";
    syndicatedCopies?: number;
  }[];
  signal: RealSignal;
  signals: RealSignal[];
  newsRetrievedAt: string | null;
  /** Present on list items: history is the last month only and evidence is omitted. */
  detail?: "summary";
  newsError: { code: string } | null;
  error: { code: string } | null;
}
export interface RealSignal {
  name: string;
  version: string;
  value: number | null;
  qualifies: boolean;
  unit: "flag" | "percent" | "headlines";
  source: string;
  period: string;
  definition: string;
  evidenceIds: string[];
}
export function signalSummary(s: RealSignal) {
  if (s.unit === "percent")
    return s.value === null
      ? `${s.name}: unavailable`
      : `${s.name}: ${s.value >= 0 ? "+" : ""}${s.value.toFixed(2)}%`;
  if (s.unit === "headlines")
    return `${s.name}: ${s.value ?? 0} headline${s.value === 1 ? "" : "s"} in 7 days`;
  return s.qualifies
    ? "Recent official disclosure"
    : "No qualifying recent disclosure";
}
export interface RealResponse {
  data: RealListing[];
  meta: {
    status: string;
    lastAttemptedRefresh: string | null;
    lastSuccessfulRefresh: string | null;
    error: { code: string; failedListings?: string[] } | null;
    coverage: {
      availableFrom: string | null;
      availableTo: string | null;
      observations: number;
      gaps: string;
    };
  };
}
export async function loadResearch(signal: AbortSignal): Promise<RealResponse> {
  const response = await fetch("/api/companies", { signal });
  if (!response.ok) throw new Error("Research API unavailable");
  const result = await response.json();
  if (result.meta?.mode !== "real" || !Array.isArray(result.data))
    throw new Error("Unexpected research response");
  return result;
}
export async function loadCompany(
  companyId: string,
  signal: AbortSignal,
): Promise<RealListing> {
  const response = await fetch(
    `/api/companies/${encodeURIComponent(companyId)}`,
    { signal },
  );
  if (!response.ok) throw new Error("Company detail unavailable");
  const result = await response.json();
  if (result.meta?.mode !== "real" || !result.data?.id)
    throw new Error("Unexpected company response");
  return result.data;
}
export type AgentStatus = {
  available: boolean;
  providers: { name: string; model: string }[];
  dailyCap: number;
};
export async function loadAgentStatus(
  signal: AbortSignal,
): Promise<AgentStatus | null> {
  const response = await fetch("/api/agent/status", { signal });
  if (!response.ok) return null;
  const result = await response.json().catch(() => null);
  return result?.meta?.mode === "real" &&
    typeof result.data?.available === "boolean"
    ? result.data
    : null;
}
export type AgentAnswer = {
  kind: "answer" | "refusal";
  text: string;
  period?: string;
  citations: { id: string; label: string; href?: string }[];
  provider: string | null;
  model: string | null;
};
/** Throws an Error whose message is the server's error code. */
export async function askResearchAgent(
  companyId: string,
  question: string,
): Promise<AgentAnswer> {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId, question }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.data?.text)
    throw new Error(result?.error?.code ?? "AGENT_ERROR");
  return result.data;
}
export function rangeStart(today: string, period: string) {
  const d = new Date(today + "T00:00:00Z"),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(
    d.getUTCMonth() - (period === "1M" ? 1 : period === "6M" ? 6 : 12),
  );
  d.setUTCDate(
    Math.min(
      day,
      new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
      ).getUTCDate(),
    ),
  );
  return d.toISOString().slice(0, 10);
}
