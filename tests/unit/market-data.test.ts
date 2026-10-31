import { describe, expect, it } from "vitest";
import { change, listings } from "../../src/data";
describe("quote and fixture contracts", () => {
  it("calculates signed change from previous close", () => {
    expect(
      change({ ...listings[0].quote, price: 90, previousClose: 100 }),
    ).toEqual({ absolute: -10, percent: -10 });
  });
  it("does not manufacture unavailable price or percentage", () => {
    expect(change({ ...listings[0].quote, price: null })).toBeNull();
    expect(change({ ...listings[0].quote, previousClose: null })).toBeNull();
    expect(
      change({ ...listings[0].quote, price: 10, previousClose: 0 }),
    ).toEqual({ absolute: 10, percent: null });
  });
  it("has unique exchange listing identities sharing company identity", () => {
    expect(new Set(listings.map((l) => l.id)).size).toBe(listings.length);
    expect(
      listings.filter((l) => l.symbol === "TCS").map((l) => l.companyId),
    ).toEqual(["tcs", "tcs"]);
  });
  it("never inserts a weekend, future point or duplicate date into synthetic history", () => {
    for (const l of listings) {
      expect(new Set(l.history.map((p) => p.date)).size).toBe(l.history.length);
      expect(l.history.length).toBeGreaterThanOrEqual(260);
      for (const p of l.history) {
        expect([0, 6]).not.toContain(new Date(p.date).getUTCDay());
        expect(p.date <= l.quote.sourceTimestamp.slice(0, 10)).toBe(true);
        expect(p.close).toBeGreaterThan(0);
      }
    }
  });
  it("keeps missing fundamentals missing and links signals to company evidence", () => {
    expect(
      listings.find((l) => l.symbol === "TATACONSUM")?.signal.value,
    ).toBeNull();
    for (const l of listings)
      for (const id of l.signal.evidenceIds)
        expect(
          l.evidence.some((e) => e.id === id && e.companyId === l.companyId),
        ).toBe(true);
  });
});
