import { it, expect } from "vitest";
import { normalizeDaily, calendarFrom } from "../../server/domain";
import { daily } from "../integration/helpers";
it("preserves source special sessions, date precision and raw OHLC", () => {
  const points = normalizeDaily(daily(), new Date("2026-10-31"));
  expect(points).toHaveLength(30);
  expect(points.some((p) => new Date(p.date).getUTCDay() === 0)).toBe(true);
  expect(points[0]).toMatchObject({
    date: "2026-10-01",
    close: 100,
    open: 100,
  });
});
it("rejects mismatched symbols, invalid dates, NaN, missing or impossible prices", () => {
  const raw = daily();
  raw.chart.result[0].meta.symbol = "TCS.NS";
  expect(() => normalizeDaily(raw)).toThrow();
  for (const value of ["NaN", "", "0", "-1"]) {
    const r = daily();
    r.chart.result[0].indicators.quote[0].close[0] = value;
    expect(() => normalizeDaily(r)).toThrow();
  }
});
it("clamps calendar subtraction at month ends", () => {
  expect(calendarFrom("2026-03-31", "1M")).toBe("2026-02-28");
  expect(calendarFrom("2026-10-31", "6M")).toBe("2026-04-30");
});
it("skips null gaps and unfinished current-day candles without manufacturing prices", () => {
  const r = daily();
  r.chart.result[0].indicators.quote[0].close[0] = null;
  expect(normalizeDaily(r, new Date("2026-10-30T10:00:00Z"))).toHaveLength(28);
});
it("handles close-only data and never uses dividend-adjusted close arrays", () => {
  const r = daily();
  r.chart.result[0].indicators.quote[0].open[0] = null;
  r.chart.result[0].indicators.adjclose = [{ adjclose: Array(30).fill(1) }];
  const p = normalizeDaily(r, new Date("2026-10-31"));
  expect(p[0].open).toBeUndefined();
  expect(p[0].close).toBe(100);
  expect(p[0].basis).toBe("split-adjusted");
});
it("rejects currency/exchange mismatches, duplicate dates and malformed arrays", () => {
  for (const field of ["currency", "exchangeName", "exchangeTimezoneName"]) {
    const r = daily();
    r.chart.result[0].meta[field] = "wrong";
    expect(() => normalizeDaily(r)).toThrow("PROVIDER_IDENTITY_MISMATCH");
  }
  const r = daily();
  r.chart.result[0].timestamp[1] = r.chart.result[0].timestamp[0];
  expect(() => normalizeDaily(r)).toThrow("INVALID_OR_DUPLICATE_DATE");
  const short = daily();
  short.chart.result[0].indicators.quote[0].close.pop();
  expect(() => normalizeDaily(short)).toThrow("INVALID_DAILY_SERIES");
});
