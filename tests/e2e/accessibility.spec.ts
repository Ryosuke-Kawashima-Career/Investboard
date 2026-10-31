import { test, expect } from "@playwright/test";
test("keyboard reaches research and cold real mode exposes a status", async ({
  page,
}) => {
  await page.route("**/api/companies", (r) =>
    r.fulfill({
      json: {
        data: [],
        meta: { mode: "real", status: "unavailable", error: null },
      },
    }),
  );
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to research" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Market data unavailable" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
