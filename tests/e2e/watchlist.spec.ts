import { test, expect } from "@playwright/test";
test("distinct exchange listings persist, remove and reset", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Search companies or symbols" })
    .fill("TCS");
  await page.getByRole("button", { name: "Save TCS NSE", exact: true }).click();
  await page.getByRole("button", { name: "Save TCS BSE", exact: true }).click();
  await page.getByRole("button", { name: /Watchlist/ }).click();
  await expect(page.locator(".table-row")).toHaveCount(2);
  await page.reload();
  await page.getByRole("button", { name: /Watchlist/ }).click();
  await expect(page.locator(".table-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Remove TCS BSE", exact: true })
    .click();
  await expect(page.locator(".table-row")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /Watchlist/ }).click();
  await expect(page.locator(".table-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear watchlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A fresh page for your research" }),
  ).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arbor.watchlist.v1")!).listingIds,
    ),
  ).toEqual([]);
});
test("corrupt storage does not break research", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("arbor.watchlist.v1", "{broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(
    "Saved watchlist could not be read",
  );
  await expect(page.locator(".table-row")).toHaveCount(6);
  await page
    .locator(".company-table")
    .getByRole("button", { name: "Save TCS NSE", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arbor.watchlist.v1")!).listingIds,
    ),
  ).toEqual(["NSE:TCS"]);
});
test("denied storage keeps watchlist usable for the session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value: () => {
        throw new DOMException("denied", "SecurityError");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value: () => {
        throw new DOMException("denied", "QuotaExceededError");
      },
    });
  });
  await page.goto("/");
  await page
    .locator(".company-table")
    .getByRole("button", { name: "Save TCS NSE", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("only for this session");
  await page.getByRole("button", { name: /Watchlist/ }).click();
  await expect(page.locator(".table-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear watchlist", exact: true })
    .click();
  await expect(page.locator(".table-row")).toHaveCount(0);
});
