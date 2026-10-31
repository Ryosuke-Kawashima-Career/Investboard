import { test, expect } from "@playwright/test";
test("research journey: search, listing identity, quote, history and evidence", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find your next question." }),
  ).toBeVisible();
  await expect(page.getByText("SYNTHETIC DATA", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search companies or symbols" })
    .fill("TCS");
  await expect(page.locator(".table-row")).toHaveCount(2);
  await page
    .locator(".table-row")
    .filter({ hasText: "TCS · NSE" })
    .getByRole("button", { name: "Tata Consultancy Services" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Tata Consultancy Services",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Not a current market quote", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "1M", exact: true }).click();
  await expect(page.getByRole("img", { name: /synthetic 1M/ })).toBeVisible();
  await page.getByRole("button", { name: "1Y", exact: true }).click();
  await expect(page.getByRole("img", { name: /synthetic 1Y/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Two sides of the story" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Visit company disclosures" }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "Company investor relations" }),
  ).toHaveAttribute("href", "https://www.tcs.com/investor-relations");
});
test("filters, empty state, keyboard search and mobile layout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Healthcare", exact: true }).click();
  await expect(page.locator(".table-row")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Discovery signal" })
    .selectOption("Revenue growth ≥ 10%");
  await expect(
    page.getByRole("heading", { name: "No companies match these filters" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".table-row")).toHaveCount(6);
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("textbox", { name: "Search companies or symbols" }),
  ).toBeFocused();
  await page.keyboard.type("unknown-company");
  await expect(
    page.getByRole("heading", { name: "No companies match these filters" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("methodology dialog, partial data and recoverable error state", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "About synthetic demo" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Demo data state" })
    .selectOption("error");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".table-row")).toHaveCount(6);
  await page.getByRole("button", { name: "About synthetic demo" }).click();
  await page
    .getByRole("combobox", { name: "Demo data state" })
    .selectOption("partial");
  await page.getByRole("button", { name: "Back to research" }).click();
  await expect(page.getByText(/Partial-data demo:/)).toBeVisible();
  await page
    .locator(".table-row")
    .filter({ hasText: "Tata Consumer Products" })
    .getByRole("button", { name: "Tata Consumer Products" })
    .click();
  await expect(
    page.getByRole("heading", { name: "No growth signal available" }),
  ).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(3);
});
