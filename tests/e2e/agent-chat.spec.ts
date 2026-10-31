import { test, expect } from "@playwright/test";
test("agent preview answers with citations, declines advice and clears", async ({
  page,
}) => {
  await page.goto("/?mode=demo");
  await page
    .locator(".company-table")
    .getByRole("button", { name: "Tata Consultancy Services", exact: true })
    .first()
    .click();
  const chat = page.locator(".agent-chat");
  await chat.getByRole("button", { name: "How has the price moved?" }).click();
  await expect(chat.locator(".agent-a.answer")).toContainText("Over 1M");
  await expect(chat.getByText("AI-generated · demo").first()).toBeVisible();
  const input = chat.getByRole("textbox", { name: "Ask the research agent" });
  await input.fill("Should I buy this stock?");
  await input.press("Enter");
  await expect(chat.locator(".agent-a.refusal")).toContainText(
    "can't give buy, sell or hold advice",
  );
  await expect(chat.locator(".agent-a.refusal a").first()).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await chat.getByRole("button", { name: "Clear conversation" }).click();
  await expect(chat.locator(".agent-a")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
