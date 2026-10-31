import { test, expect } from "@playwright/test";
import { Store } from "../../server/store";
import { snapshot } from "../../server/api";
import { normalizeDaily } from "../../server/domain";
import { importEvidence } from "../../server/evidence";
import { daily, evidence } from "../integration/helpers";

function payload() {
  const store = new Store(":memory:");
  store.saveHistory(
    normalizeDaily(daily(), new Date("2026-10-31")),
    "2026-10-31T00:00:00Z",
  );
  importEvidence(store, evidence());
  const s = snapshot(store, new Date("2026-10-31"));
  store.close();
  return { data: s.data, meta: s.meta };
}

function withHeadlines() {
  const p = payload();
  const titles = [
    "Reliance Industries Q2 net profit rises 34% to record",
    "Reliance Industries shares fall after weak refining margins",
    "Reliance Industries to raise funds via NCDs",
  ];
  p.data[0].evidence.push(
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `news-${i}`,
      title: titles[i % 3],
      url: `https://news.google.com/rss/articles/test-${i}`,
      publisher: `Publisher ${i % 6}`,
      summary: null,
      publishedAt: "2026-10-29",
      retrievedAt: "2026-10-31T05:00:00Z",
      verifiedAt: null,
      claimLocations: [],
      limitations: "Headline only.",
      acquisition: "google-news-rss",
      type: "news-report",
    })),
  );
  p.data[0].newsRetrievedAt = "2026-10-31T05:00:00Z";
  return p;
}

test("real headline tone and rule-based agent use stored data only", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-31T06:00:00Z"));
  await page.route("**/api/companies", (r) =>
    r.fulfill({ json: withHeadlines() }),
  );
  // Keep this journey on the rule-based agent regardless of local API keys.
  await page.route("**/api/agent/status", (r) =>
    r.fulfill({
      json: {
        data: { available: false, providers: [] },
        meta: { mode: "real" },
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Reliance Industries Limited", exact: true })
    .click();
  const panel = page.locator(".sentiment-panel");
  await expect(
    panel.getByRole("heading", { name: "What headlines say" }),
  ).toBeVisible();
  await expect(panel.locator(".sentiment-legend")).toContainText("positive 4");
  await expect(panel.locator(".sentiment-legend")).toContainText("negative 4");
  await expect(
    panel.getByText("Source unavailable", { exact: true }),
  ).toHaveCount(3);
  await panel.getByText(/How accurate is this\?/).click();
  await expect(panel.locator(".eval-matrix")).toBeVisible();
  const chat = page.locator(".agent-chat");
  await chat
    .getByRole("button", { name: "What is the headline tone?" })
    .click();
  await expect(chat.locator(".agent-a").first()).toContainText(
    "Google News headlines, 30 days",
  );
  await expect(chat.getByText("Rule-based answer").first()).toBeVisible();
  const input = chat.getByRole("textbox", { name: "Ask the research agent" });
  await input.fill("should I buy reliance?");
  await input.press("Enter");
  await expect(chat.locator(".agent-a.refusal")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("synthetic");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
