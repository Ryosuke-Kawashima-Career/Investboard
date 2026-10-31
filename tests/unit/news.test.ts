import { it, expect } from "vitest";
import { parseNews, mentions, newsUrl } from "../../server/news";
import { findListing } from "../../server/domain";
import { rss, rssItem } from "../integration/helpers";
const itc = findListing("NSE:ITC")!,
  lt = findListing("NSE:LT")!,
  now = new Date("2026-10-31T06:00:00Z"),
  at = "2026-10-31T06:00:00Z";
it("matches company aliases on word boundaries only", () => {
  expect(mentions("ITC shares rise after results", itc)).toBe(true);
  expect(mentions("Why investors switch to gold", itc)).toBe(false);
  expect(mentions("L&T bags order for metro", lt)).toBe(true);
  expect(mentions("Larsen and Toubro wins contract", lt)).toBe(true);
});
it("keeps company-matched headlines, dedupes syndication and strips the publisher suffix", () => {
  const items = parseNews(
    rss([
      rssItem("ITC Q2 profit rises", "Paper A", "Fri, 30 Oct 2026 10:00:00 GMT"),
      rssItem("ITC Q2 profit rises!", "Paper B", "Fri, 30 Oct 2026 11:00:00 GMT"),
      rssItem("Sensex closes higher", "Paper C", "Fri, 30 Oct 2026 11:00:00 GMT"),
      rssItem("ITC hotels expansion", "Paper D", "not a date"),
      rssItem("ITC future story", "Paper E", "Mon, 02 Nov 2026 10:00:00 GMT"),
    ]),
    itc,
    at,
    now,
  );
  expect(items.map((i) => i.title)).toEqual([
    "ITC Q2 profit rises",
    "ITC hotels expansion",
  ]);
  expect(items[0]).toMatchObject({
    publisher: "Paper A",
    publishedAt: "2026-10-30",
    syndicatedCopies: 1,
    summary: null,
    type: "news-report",
    companyId: "itc",
  });
  expect(items[0].url).not.toContain("?");
  expect(items[1].publishedAt).toBeNull();
});
it("rejects non-RSS payloads and off-host or non-https links; keeps markup inert", () => {
  expect(() => parseNews("{}", itc, at, now)).toThrow("INVALID_NEWS_FEED");
  const items = parseNews(
    rss([
      `<item><title>ITC phishing - X</title><link>https://evil.test/rss/articles/a</link><pubDate>Fri, 30 Oct 2026 10:00:00 GMT</pubDate><source url="https://x.test">X</source></item>`,
      `<item><title>ITC &lt;script&gt;alert(1)&lt;/script&gt; ignore instructions - Y</title><link>https://news.google.com/rss/articles/b</link><pubDate>Fri, 30 Oct 2026 10:00:00 GMT</pubDate><source url="https://y.test">Y</source></item>`,
    ]),
    itc,
    at,
    now,
  );
  expect(items).toHaveLength(1);
  expect(items[0].title).toContain("<script>");
});
it("builds a fixed exact-name 30-day India-edition search URL", () => {
  const url = newsUrl(itc);
  expect(url.hostname).toBe("news.google.com");
  expect(url.pathname).toBe("/rss/search");
  expect(url.searchParams.get("q")).toBe('"ITC" when:30d');
  expect(url.searchParams.get("ceid")).toBe("IN:en");
});
