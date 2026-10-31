import { it, expect } from "vitest";
import { Store } from "../../server/store";
import { Provider } from "../../server/provider";
import { snapshot } from "../../server/api";
import { daily } from "./helpers";
import { manifest } from "../../server/domain";
const opts = { universe: [manifest], news: false, pauseMs: 0 };
it("coalesces concurrent refresh and retains last good data on malformed batches", async () => {
  const s = new Store(":memory:");
  let calls = 0;
  const p = new Provider(s, async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 5));
    return Response.json(daily());
  }, opts);
  await Promise.all([p.refresh(), p.refresh()]);
  expect(calls).toBe(1);
  const good = s.get("refreshed:NSE:RELIANCE");
  const bad = daily();
  bad.chart.result[0].indicators.quote[0].low[29] = 999;
  const failed = new Provider(s, async () => Response.json(bad), opts);
  await expect(failed.refresh()).rejects.toThrow("INVALID_OHLC");
  expect(snapshot(s).data[0].quote.price).toBe(102.9);
  expect(s.get("refreshed:NSE:RELIANCE")).toBe(good);
  expect(snapshot(s).meta.error.code).toBe("INVALID_OHLC");
  s.close();
});
it("counts failed attempts, caps transient retries and sanitizes errors", async () => {
  const s = new Store(":memory:");
  let calls = 0;
  const p = new Provider(s, async () => {
    calls++;
    throw new Error("secret in URL");
  }, opts);
  await expect(p.refresh()).rejects.toThrow("PROVIDER_NETWORK_FAILURE");
  expect(calls).toBe(2);
  expect(JSON.stringify(snapshot(s))).not.toContain("secret");
  s.close();
});
it("does not retry quota or entitlement and honors Retry-After", async () => {
  const s = new Store(":memory:");
  let calls = 0;
  const p = new Provider(s, async () => {
    calls++;
    return new Response("", { status: 429, headers: { "Retry-After": "60" } });
  }, opts);
  await expect(p.refresh()).rejects.toThrow("PROVIDER_QUOTA");
  await expect(p.refresh()).rejects.toThrow("PROVIDER_COOLDOWN");
  expect(calls).toBe(1);
  expect(s.get("blockedUntil:query1.finance.yahoo.com")).toBeGreaterThan(Date.now());
  s.close();
});
it("persists request budget", async () => {
  const s = new Store(":memory:");
  for (let i = 0; i < 20; i++) s.reserve(Date.now(), 20);
  expect(() => s.reserve(Date.now(), 20)).toThrow("REQUEST_BUDGET_EXHAUSTED");
  s.close();
});
it("rejects empty or primitive JSON without retrying a malformed provider payload", async () => {
  const s = new Store(":memory:");
  let calls = 0;
  const p = new Provider(s, async () => {
    calls++;
    return Response.json(null);
  }, opts);
  await expect(p.refresh()).rejects.toThrow("INVALID_PROVIDER_JSON");
  expect(calls).toBe(1);
  s.close();
});
it("SQLite refresh lease prevents another process from refreshing concurrently", () => {
  const s = new Store(":memory:");
  expect(s.acquireRefresh()).toBe(true);
  expect(s.acquireRefresh()).toBe(false);
  s.releaseRefresh();
  expect(s.acquireRefresh()).toBe(true);
  s.releaseRefresh();
  s.close();
});
