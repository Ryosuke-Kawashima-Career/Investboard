import { test, expect } from "@playwright/test";
import { Store } from "../../server/store";
import { route } from "../../server/api";
import { normalizeDaily } from "../../server/domain";
import { importEvidence } from "../../server/evidence";
import { daily, evidence } from "../integration/helpers";

function api() {
  const store = new Store(":memory:");
  const now = new Date("2026-10-31");
  store.saveHistory(normalizeDaily(daily(), now), "2026-10-31T00:00:00Z");
  importEvidence(store, evidence());
  const read = (path: string) =>
    route(store, new URL("http://local" + path), now).body;
  return {
    list: read("/api/companies"),
    detail: read("/api/companies/reliance"),
  };
}

test("company page loads full detail after the compact list, with retry", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-31T06:00:00Z"));
  const { list, detail } = api();
  expect(list.data[0].detail).toBe("summary");
  let failNext = true;
  await page.route("**/api/companies", (r) => r.fulfill({ json: list }));
  await page.route("**/api/companies/reliance", (r) => {
    if (failNext) {
      failNext = false;
      return r.fulfill({ status: 503, json: {} });
    }
    return r.fulfill({ json: detail });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Reliance Industries Limited", exact: true })
    .click();
  await expect(
    page.getByText("Full history and headlines could not be loaded", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator(".chart-full")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open original disclosure" }),
  ).toHaveAttribute("href", evidence().url);
  await expect(page.getByText(/observed sessions/)).toBeVisible();
});
