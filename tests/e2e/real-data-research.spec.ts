import { test, expect } from "@playwright/test";
import { Store } from "../../server/store";
import { snapshot } from "../../server/api";
import { normalizeDaily } from "../../server/domain";
import { importEvidence } from "../../server/evidence";
import { daily, evidence } from "../integration/helpers";
export function payload() {
  const store = new Store(":memory:");
  store.saveHistory(
    normalizeDaily(daily(), new Date("2026-10-31")),
    "2026-10-31T00:00:00Z",
  );
  importEvidence(
    store,
    evidence({
      summary:
        "<script>window.sourceExecuted=true</script> Source text is inert.",
    }),
  );
  const s = snapshot(store, new Date("2026-10-31"));
  store.close();
  return { data: s.data, meta: s.meta };
}
test("real service journey, calendar history, disclosure, local watchlist and unsupported IDs", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-31T06:00:00Z"));
  await page.route("**/api/companies", (r) => r.fulfill({ json: payload() }));
  await page.goto("/");
  await expect(page.getByText("REAL DATA", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search companies or symbols" })
    .fill("reliance");
  await page
    .getByRole("button", { name: "Reliance Industries Limited", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Reliance Industries Limited",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "1Y", exact: true }).click();
  await expect(page.getByText(/Partial history for this range/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open original disclosure" }),
  ).toHaveAttribute("href", evidence().url);
  await expect(page.locator("body")).not.toContainText("synthetic");
  expect(
    await page.evaluate(() => Reflect.get(window, "sourceExecuted")),
  ).toBeUndefined();
  await page.getByRole("button", { name: "Save RELIANCE NSE" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Watchlist/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Reliance Industries Limited",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem(
      "arbor.watchlist.v1",
      JSON.stringify({ version: 1, listingIds: ["NSE:RELIANCE", "NSE:TCS"] }),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: /Watchlist/ }).click();
  await page
    .getByRole("button", { name: "Remove NSE:TCS", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/real-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("cold-cache API failure has retry and never falls back to demo", async ({
  page,
}) => {
  await page.route("**/api/companies", (r) =>
    r.fulfill({ status: 503, json: { error: { code: "UNAVAILABLE" } } }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Research API unavailable",
  );
  await expect(page.locator("body")).not.toContainText("Tata Consultancy");
  await expect(
    page.getByRole("button", { name: "Retry" }).first(),
  ).toBeVisible();
});
