import { expect, it } from "vitest";
import {
  MIN_AUTHORS,
  MIN_ITEMS,
  aggregateSentiment,
  syntheticSentiment,
  type SentimentItem,
} from "../../src/sentiment";

const now = "2026-10-30";
const item = (
  i: number,
  label: SentimentItem["label"],
  overrides: Partial<SentimentItem> = {},
): SentimentItem => ({
  id: `p${i}`,
  url: `https://example.test/p/${i}`,
  author: `a${i % 12}`,
  date: "2026-10-28",
  label,
  text: `post ${i}`,
  ...overrides,
});

it("withholds sentiment below the minimum sample and never reports neutral", () => {
  const result = aggregateSentiment(
    [item(1, "positive"), item(2, "negative")],
    7,
    now,
  );
  expect(result.status).toBe("insufficient");
  expect(result.counts).toBeNull();
  expect(result.retrieved).toBe(2);
});

it("counts labels, deduplicates reposts and computes prior-period change", () => {
  const current = Array.from({ length: MIN_ITEMS }, (_, i) =>
    item(i, i % 3 === 0 ? "negative" : "positive"),
  );
  const repost = { ...current[0], id: "dup" };
  const prior = Array.from({ length: MIN_ITEMS }, (_, i) =>
    item(100 + i, "positive", { date: "2026-10-20" }),
  );
  const result = aggregateSentiment([...current, repost, ...prior], 7, now);
  expect(result.status).toBe("ok");
  expect(result.retrieved).toBe(MIN_ITEMS);
  expect(result.duplicatesRemoved).toBe(1);
  expect(result.counts).toMatchObject({ positive: 20, negative: 10 });
  expect(result.positiveShareChange).toBeCloseTo(-33.3, 1);
});

it("flags author concentration and volume spikes", () => {
  const items = Array.from({ length: 40 }, (_, i) =>
    item(i, "positive", {
      author: i < 20 ? "loud" : `a${i % MIN_AUTHORS}`,
      date: i < 30 ? "2026-10-29" : "2026-10-25",
    }),
  );
  const result = aggregateSentiment(items, 7, now);
  expect(result.flags).toContain("author-concentration");
  expect(result.flags).toContain("volume-spike");
});

it("generates deterministic synthetic fixtures with an unavailable source", () => {
  const a = syntheticSentiment("NSE:TCS", now);
  const b = syntheticSentiment("NSE:TCS", now);
  expect(a).toEqual(b);
  expect(a.synthetic).toBe(true);
  expect(a.sources.some((s) => s.status === "unavailable")).toBe(true);
  expect(a.trends.points.every((p) => p.value >= 0 && p.value <= 100)).toBe(
    true,
  );
});
