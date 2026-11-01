import { test, expect } from "@playwright/test";
test("synthetic sentiment panel shows counts, states and labels", async ({
  page,
}) => {
  await page.goto("/?mode=demo");
  await page
    .locator(".company-table")
    .getByRole("button", { name: "Tata Consultancy Services", exact: true })
    .first()
    .click();
  const panel = page.locator(".sentiment-panel");
  await expect(
    panel.getByText("Synthetic fixture", { exact: false }),
  ).toBeVisible();
  await expect(panel.locator(".sentiment-unavailable")).toHaveText(
    "Source unavailable: X. Not counted as neutral.",
  );
  await expect(
    panel.getByText("not sentiment", { exact: false }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "30D" }).click();
  await expect(panel.getByRole("button", { name: "30D" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(panel.locator(".sentiment-bar")).toBeVisible();
  await expect(
    panel.getByText("not yet measured", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
