import { createHash } from "node:crypto";
import { indiaDate, type ListingManifest } from "./domain.ts";
export const NEWS_HOST = "news.google.com";
export const MAX_NEWS_PER_COMPANY = 20;
export function newsUrl(listing: ListingManifest) {
  const url = new URL(`https://${NEWS_HOST}/rss/search`);
  url.search = new URLSearchParams({
    q: `"${listing.name.replace(/ Limited$/, "")}" when:30d`,
    hl: "en-IN",
    gl: "IN",
    ceid: "IN:en",
  }).toString();
  return url;
}
function decode(text: string) {
  return text
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(+n, 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}
function tag(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}(\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return match ? { attrs: match[1] || "", text: decode(match[2]) } : null;
}
// Word-boundary match so "ITC" does not match "switch" and aliases with "&" still work.
export function mentions(title: string, listing: ListingManifest) {
  const lower = title.toLowerCase();
  return listing.aliases.some((alias) => {
    const a = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${a}($|[^a-z0-9])`).test(lower);
  });
}
const headlineKey = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function parseNews(
  xml: string,
  listing: ListingManifest,
  retrievedAt: string,
  now = new Date(),
) {
  if (typeof xml !== "string" || !/<rss[\s>]/.test(xml))
    throw new Error("INVALID_NEWS_FEED");
  const items = xml.match(/<item>[\s\S]*?<\/item>/g)?.slice(0, 100) ?? [];
  const today = indiaDate(now);
  const byHeadline = new Map<string, any>();
  for (const item of items) {
    const rawTitle = tag(item, "title")?.text;
    const link = tag(item, "link")?.text;
    const source = tag(item, "source");
    if (!rawTitle || !link || !source?.text) continue;
    const publisher = source.text.slice(0, 120);
    // Google News appends " - Publisher"; strip it so syndicated copies share a key.
    const title = rawTitle.endsWith(` - ${publisher}`)
      ? rawTitle.slice(0, -publisher.length - 3)
      : rawTitle;
    if (title.length > 300 || !mentions(title, listing)) continue;
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      continue;
    }
    if (
      url.protocol !== "https:" ||
      url.hostname !== NEWS_HOST ||
      !url.pathname.startsWith("/rss/articles/")
    )
      continue;
    const pub = Date.parse(tag(item, "pubDate")?.text ?? "");
    const publishedAt = Number.isFinite(pub) ? indiaDate(new Date(pub)) : null;
    if (publishedAt && publishedAt > today) continue;
    const publisherSite = source.attrs.match(/url="(https:\/\/[^"]+)"/)?.[1];
    let publisherHost: string | null = null;
    try {
      publisherHost = publisherSite ? new URL(decode(publisherSite)).hostname : null;
    } catch {}
    const key = headlineKey(title);
    const existing = byHeadline.get(key);
    if (existing) {
      existing.syndicatedCopies++;
      continue;
    }
    url.search = "";
    byHeadline.set(key, {
      id: createHash("sha256").update(url.href).digest("hex").slice(0, 16),
      companyId: listing.companyId,
      companyName: listing.name,
      publisher,
      publisherHost,
      url: url.href,
      title,
      summary: null,
      publishedAt,
      retrievedAt,
      verifiedAt: null,
      claimLocations: [],
      limitations:
        "Headline only, via Google News search. Not checked against the article body; may be reporting or opinion.",
      kind: "unclassified",
      coverage: "search-headline",
      acquisition: "google-news-rss",
      type: "news-report",
      syndicatedCopies: 0,
    });
  }
  return [...byHeadline.values()]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, MAX_NEWS_PER_COMPANY);
}
