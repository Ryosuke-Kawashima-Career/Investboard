import { manifest, UNIVERSE, type ListingManifest } from "../../server/domain";
export function daily(listing: ListingManifest = manifest): any {
  const n = 30;
  return {
    chart: {
      error: null,
      result: [
        {
          meta: {
            symbol: listing.providerSymbol,
            currency: "INR",
            exchangeName: "NSI",
            instrumentType: "EQUITY",
            exchangeTimezoneName: "Asia/Kolkata",
            longName: listing.providerName ?? listing.name,
          },
          timestamp: Array.from(
            { length: n },
            (_, i) =>
              Date.parse(
                `2026-10-${String(i + 1).padStart(2, "0")}T03:45:00Z`,
              ) / 1000,
          ),
          indicators: {
            quote: [
              {
                open: Array(n).fill(100),
                high: Array(n).fill(110),
                low: Array(n).fill(90),
                close: Array.from({ length: n }, (_, i) => 100 + i / 10),
                volume: Array(n).fill(1000),
              },
            ],
          },
        },
      ],
    },
  };
}
export function rssItem(
  title: string,
  publisher: string,
  pubDate: string,
  slug = encodeURIComponent(title + publisher),
) {
  return `<item><title>${title} - ${publisher}</title><link>https://news.google.com/rss/articles/${slug}?oc=5</link><pubDate>${pubDate}</pubDate><source url="https://${publisher.toLowerCase().replace(/\W/g, "")}.test">${publisher}</source></item>`;
}
export function rss(items: string[]) {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Synthetic CI feed</title>${items.join("")}</channel></rss>`;
}
// Routes synthetic responses by destination so a full-universe refresh stays offline.
export function fakeTransport(newsItems: string[] = []) {
  const calls: string[] = [];
  const transport = (async (input: URL | string) => {
    const url = new URL(String(input));
    calls.push(url.hostname + url.pathname);
    if (url.hostname === "news.google.com")
      return new Response(rss(newsItems), {
        headers: { "Content-Type": "application/rss+xml" },
      });
    const listing = UNIVERSE.find((l) =>
      url.pathname.endsWith("/" + l.providerSymbol),
    );
    return Response.json(daily(listing));
  }) as typeof fetch;
  return { transport, calls };
}
export function evidence(overrides = {}) {
  return {
    companyId: "reliance",
    companyName: manifest.name,
    publisher: manifest.name,
    operatorVerified: true,
    url: "https://www.ril.com/reports/test-disclosure.pdf",
    title: "Test-only disclosure",
    summary: "Synthetic CI text, not a market claim.",
    publishedAt: "2026-10-20",
    retrievedAt: "2026-10-30T00:00:00Z",
    verifiedAt: "2026-10-30T00:00:00Z",
    claimLocations: ["Page 1"],
    limitations: "No independent or contrary evidence reviewed.",
    ...overrides,
  };
}
