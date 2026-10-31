import { test, expect } from "@playwright/test";
import { Store } from "../../server/store";
import { snapshot } from "../../server/api";
import { findListing, normalizeDaily } from "../../server/domain";
import { parseNews } from "../../server/news";
import { daily, rss, rssItem } from "../integration/helpers";
const now = new Date("2026-10-31T06:00:00Z");
function payload() {
  const store = new Store(":memory:");
  const infy = findListing("NSE:INFY")!,
    tcs = findListing("NSE:TCS")!;
  // INFY rises ~10% over the month; TCS stays flat.
  const rising = daily(infy);
  rising.chart.result[0].indicators.quote[0].close = Array.from(
    { length: 30 },
    (_, i) => (i === 29 ? 110 : 100),
  );
  rising.chart.result[0].indicators.quote[0].high = Array(30).fill(120);
  // Momentum needs a base session on or before one calendar month earlier.
  rising.chart.result[0].timestamp[0] = Date.parse("2026-09-30T03:45:00Z") / 1000;
  store.saveHistory(normalizeDaily(rising, now, infy), now.toISOString(), infy);
  store.saveHistory(normalizeDaily(daily(tcs), now, tcs), now.toISOString(), tcs);
  store.replaceNews(
    "tcs",
    parseNews(
      rss([
        rssItem("TCS signs AI partnership", "Paper A", "Fri, 30 Oct 2026 08:00:00 GMT"),
        rssItem("TCS hiring slows", "Paper B", "Thu, 29 Oct 2026 08:00:00 GMT"),
        rssItem("TCS opens Kochi office", "Paper C", "Wed, 28 Oct 2026 08:00:00 GMT"),
      ]),
      tcs,
      now.toISOString(),
      now,
    ),
  );
  const s = snapshot(store, now);
  store.close();
  return { data: s.data, meta: s.meta };
}
test("signals filter the universe and company pages link news headlines", async ({
  page,
}) => {
  await page.clock.setFixedTime(now);
  await page.route("**/api/companies", (r) => r.fulfill({ json: payload() }));
  await page.goto("/");
  const signal = page.getByLabel("Discovery signal", { exact: true });
  await signal.selectOption("price-momentum-1m-v1");
  await expect(page.getByRole("button", { name: "Infosys Limited" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tata Consultancy Services Limited" }),
  ).toHaveCount(0);
  await signal.selectOption("news-coverage-7d-v1");
  await expect(page.getByRole("button", { name: "Infosys Limited" })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tata Consultancy Services Limited" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recent news headlines" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "TCS hiring slows" })).toBeVisible();
  const links = page.getByRole("link", { name: /Open article via Google News/ });
  await expect(links).toHaveCount(3);
  await expect(links.first()).toHaveAttribute(
    "href",
    /^https:\/\/news\.google\.com\/rss\/articles\//,
  );
  await expect(
    page.getByRole("heading", { name: /Recent news coverage: 3 headlines/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
