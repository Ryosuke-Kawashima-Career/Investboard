import { expect, it } from "vitest";
import { aggregateHistory, summarizePeriod } from "../../src/chart-data";
import { listings, type HistoryPoint } from "../../src/data";
const point = (
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
): HistoryPoint => ({
  date,
  open,
  high,
  low,
  close,
  currency: "INR",
  source: "test",
  basis: "unadjusted",
});
it("preserves OHLC when aggregating calendar weeks", () => {
  const bars = aggregateHistory(
    [
      point("2026-10-19", 10, 14, 8, 12),
      point("2026-10-20", 12, 17, 11, 16),
      point("2026-10-26", 16, 18, 13, 14),
    ],
    "6M",
  );
  expect(bars).toHaveLength(2);
  expect(bars[0]).toMatchObject({
    date: "2026-10-19",
    endDate: "2026-10-20",
    open: 10,
    high: 17,
    low: 8,
    close: 16,
  });
  expect(bars[1]).toMatchObject({ open: 16, high: 18, low: 13, close: 14 });
});
it("keeps daily bars and aggregates calendar months without filling gaps", () => {
  const history = [
    point("2026-09-29", 10, 14, 8, 12),
    point("2026-10-01", 12, 17, 11, 16),
    point("2026-10-30", 16, 18, 13, 14),
  ];
  expect(aggregateHistory(history, "1M")).toHaveLength(3);
  expect(aggregateHistory(history, "1Y")).toHaveLength(2);
  expect(aggregateHistory(history, "1Y")[1]).toMatchObject({
    open: 12,
    high: 18,
    low: 11,
    close: 14,
  });
  expect(aggregateHistory([], "1M")).toEqual([]);
});
it("synthetic OHLC contains the body and has both rising and falling sessions", () => {
  for (const listing of listings) {
    expect(listing.history.some((p) => p.close > p.open!)).toBe(true);
    expect(listing.history.some((p) => p.close < p.open!)).toBe(true);
    for (const p of listing.history) {
      expect(p.high).toBeGreaterThanOrEqual(Math.max(p.open!, p.close));
      expect(p.low).toBeLessThanOrEqual(Math.min(p.open!, p.close));
      expect(p.low).toBeGreaterThan(0);
    }
  }
});
it("close-only history does not manufacture candle data", () => {
  const p = {
    date: "2026-10-30",
    close: 20,
    currency: "INR",
    source: "test",
    basis: "unadjusted",
  } as HistoryPoint;
  expect(aggregateHistory([p], "1M")[0].open).toBeUndefined();
});
it("history ends at the displayed quote and previous close", () => {
  for (const listing of listings) {
    expect(listing.history.at(-1)?.close).toBe(listing.quote.price);
    expect(listing.history.at(-2)?.close).toBe(listing.quote.previousClose);
  }
});
it("summarizes period change from first to last close with dated high and low", () => {
  const summary = summarizePeriod([
    point("2026-10-01", 100, 104, 98, 100),
    point("2026-10-02", 101, 112, 99, 110),
    point("2026-10-05", 108, 109, 95, 105),
  ]);
  expect(summary).toMatchObject({
    firstDate: "2026-10-01",
    lastDate: "2026-10-05",
    firstClose: 100,
    lastClose: 105,
    change: 5,
    percent: 5,
    high: { value: 112, date: "2026-10-02" },
    low: { value: 95, date: "2026-10-05" },
    sessions: 3,
  });
});
it("uses closes for high and low when OHLC is not supplied", () => {
  const close = (date: string, value: number) =>
    ({ date, close: value, currency: "INR", source: "test", basis: "unadjusted" }) as HistoryPoint;
  const summary = summarizePeriod([close("2026-10-01", 50), close("2026-10-02", 40), close("2026-10-03", 45)]);
  expect(summary).toMatchObject({
    change: -5,
    percent: -10,
    high: { value: 50, date: "2026-10-01" },
    low: { value: 40, date: "2026-10-02" },
  });
});
it("never reports a change for fewer than two sessions or a zero base", () => {
  expect(summarizePeriod([])).toBeNull();
  expect(summarizePeriod([point("2026-10-01", 1, 2, 1, 1)])).toBeNull();
  const zero = summarizePeriod([
    point("2026-10-01", 0, 0, 0, 0),
    point("2026-10-02", 1, 2, 1, 2),
  ]);
  expect(zero?.change).toBe(2);
  expect(zero?.percent).toBeNull();
});
