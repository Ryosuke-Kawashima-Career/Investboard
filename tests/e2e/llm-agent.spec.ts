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

test("LLM agent shows cited AI answers and falls back to rules on failure", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-31T06:00:00Z"));
  await page.route("**/api/companies", (r) => r.fulfill({ json: payload() }));
  await page.route("**/api/agent/status", (r) =>
    r.fulfill({
      json: {
        data: {
          available: true,
          providers: [{ name: "anthropic", model: "claude-opus-5-5" }],
          dailyCap: 50,
        },
        meta: { mode: "real" },
      },
    }),
  );
  let calls = 0;
  await page.route("**/api/agent", (r) => {
    calls++;
    if (calls === 1)
      return r.fulfill({
        json: {
          data: {
            kind: "answer",
            text: "The close rose over the month [P1M]; see the filing [D1].",
            period: "2026-10-01 – 2026-10-30",
            citations: [
              { id: "P1M", label: "1M closes · Yahoo Finance" },
              {
                id: "D1",
                label: "Test-only disclosure",
                href: evidence().url,
              },
            ],
            provider: "anthropic",
            model: "claude-opus-5-5",
          },
        },
      });
    return r.fulfill({
      status: 502,
      json: { error: { code: "AGENT_PROVIDER_FAILED", fallback: true } },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Reliance Industries Limited", exact: true })
    .click();
  const chat = page.locator(".agent-chat");
  await expect(chat.getByText(/AI answers \(anthropic/)).toBeVisible();
  await chat.getByRole("button", { name: "How has the price moved?" }).click();
  await expect(
    chat.getByText("AI-generated · anthropic claude-opus-5-5"),
  ).toBeVisible();
  await expect(chat.getByRole("link", { name: /\[D1\]/ })).toHaveAttribute(
    "href",
    evidence().url,
  );
  const input = chat.getByRole("textbox", { name: "Ask the research agent" });
  await input.fill("Summarise the headlines");
  await input.press("Enter");
  await expect(
    chat.getByText(/AI providers did not respond; rule-based answer shown/),
  ).toBeVisible();
  await input.fill("Should I buy?");
  await input.press("Enter");
  await expect(chat.locator(".agent-a.refusal")).toBeVisible();
  expect(calls).toBe(2);
  await expect(page.locator("body")).not.toContainText("synthetic");
});
