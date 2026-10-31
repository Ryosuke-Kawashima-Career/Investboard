import { afterEach, expect, it, vi } from "vitest";
import { UNIVERSE } from "../../server/domain";
import { Provider } from "../../server/provider";
import { Store } from "../../server/store";

afterEach(() => vi.unstubAllEnvs());

it("covers 50 distinct NSE listings across many sectors", () => {
  expect(UNIVERSE).toHaveLength(50);
  for (const key of ["id", "companyId", "providerSymbol", "name"] as const)
    expect(new Set(UNIVERSE.map((l) => l[key])).size).toBe(UNIVERSE.length);
  expect(new Set(UNIVERSE.map((l) => l.sector)).size).toBeGreaterThanOrEqual(
    12,
  );
  for (const l of UNIVERSE) {
    expect(l.providerSymbol).toMatch(/^[A-Z0-9-]+\.NS$/);
    expect(l.aliases.every((a) => a.length >= 3)).toBe(true);
  }
});

it("default request budget fits one full refresh with news, under a hard cap", () => {
  vi.stubEnv("PROVIDER_DAILY_BUDGET", "");
  const p = new Provider(new Store(":memory:"));
  expect(p.budget()).toBeGreaterThanOrEqual(UNIVERSE.length * 2);
  vi.stubEnv("PROVIDER_DAILY_BUDGET", "100000");
  expect(p.budget()).toBeLessThanOrEqual(250);
});
