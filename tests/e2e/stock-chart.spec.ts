import { test, expect } from "@playwright/test";
test("candles, periods, line toggle and accessible inspection", async ({
  page,
}) => {
  await page.goto("/?mode=demo");
  await page
    .locator(".company-table")
    .getByRole("button", { name: "Tata Consultancy Services", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Candles", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".candle-body").first()).toBeVisible();
  await expect(page.getByText("Weekly bars", { exact: true })).toBeVisible();
  const chart = page.getByRole("group", { name: "Inspect price chart" });
  await chart.focus();
  const initial = await page.locator(".ohlc-date").innerText();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".ohlc-date")).not.toHaveText(initial);
  await page.getByRole("button", { name: "1M", exact: true }).click();
  await expect(page.locator(".candle-body")).toHaveCount(22);
  await expect(page.getByText("Daily bars", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "1Y", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Line", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".candle-body")).toHaveCount(0);
  await expect(page.locator(".chart-full polyline")).toBeVisible();
  await page.getByRole("button", { name: "Candles", exact: true }).click();
  await expect(page.getByText("Monthly bars", { exact: true })).toBeVisible();
  await expect(page.locator(".candle-body").first()).toBeVisible();
  await page.getByRole("button", { name: "Line", exact: true }).click();
  await expect(page.locator(".candle-body")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("period change is readable without hovering and follows inspection", async ({
  page,
}) => {
  await page.goto("/?mode=demo");
  await page
    .locator(".company-table")
    .getByRole("button", { name: "Tata Consultancy Services", exact: true })
    .first()
    .click();
  for (const period of ["1M", "6M", "1Y"]) {
    await page.getByRole("button", { name: period, exact: true }).click();
    await expect(page.locator(".period-change")).toHaveText(
      /^(Up|Down|Unchanged) ₹[\d,.]+ \([+−]\d+\.\d{2}%\) since \d{4}-\d{2}-\d{2}$/,
    );
    await expect(page.locator(".period-detail")).toContainText(/High ₹.* on \d{4}-\d{2}-\d{2} · Low ₹.* · \d+ sessions/);
    await expect(page.locator(".chart-marker.high")).toHaveCount(1);
    await expect(page.locator(".chart-marker.low")).toHaveCount(1);
  }
  const since = page.locator(".since-start");
  const latest = await since.innerText();
  await page.getByRole("group", { name: "Inspect price chart" }).focus();
  await page.keyboard.press("Home");
  await expect(since).toHaveText(/^Unchanged ₹0\.00 \(\+0\.00%\)$/);
  expect(latest).not.toBe("");
});
