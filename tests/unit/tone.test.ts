import { expect, it } from "vitest";
import {
  TONE_THRESHOLD,
  classifyHeadline,
  evaluateTone,
  headlineToneBundle,
  toneEval,
} from "../../src/tone";
import { aggregateSentiment } from "../../src/sentiment";

it("classifies clear gains, losses, both and neither", () => {
  expect(classifyHeadline("Acme Q2 net profit rises 34% to record")).toBe(
    "positive",
  );
  expect(classifyHeadline("Acme shares fall 5% after DOJ probe")).toBe(
    "negative",
  );
  expect(
    classifyHeadline("Acme profit falls 36% on one-time hit; stock jumps"),
  ).toBe("mixed");
  expect(classifyHeadline("Acme to participate in investor day")).toBe(
    "neutral",
  );
  expect(
    classifyHeadline("Acme में ब्रेकआउट की तैयारी? क्या है अहम लेवल"),
  ).toBe("unclassifiable");
});

it("publishes accuracy and a confusion matrix from the labeled set", () => {
  const result = evaluateTone(toneEval.items);
  expect(result.n).toBe(100);
  const total = Object.values(result.matrix).reduce(
    (sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0),
    0,
  );
  expect(total).toBe(100);
  expect(result.accuracy).toBeGreaterThanOrEqual(TONE_THRESHOLD);
});

it("builds a real bundle with unavailable social sources and no synthetic flag", () => {
  const bundle = headlineToneBundle(
    Array.from({ length: 12 }, (_, i) => ({
      id: `n${i}`,
      title: i % 2 ? "Acme profit jumps 20%" : "Acme shares slump",
      url: `https://news.google.com/rss/articles/${i}`,
      publisher: `Pub ${i % 6}`,
      publishedAt: "2026-10-29",
      type: "news-report" as const,
    })),
    "2026-10-31T08:00:00Z",
  );
  expect(bundle.synthetic).toBe(false);
  expect(bundle.trends).toBeNull();
  expect(
    bundle.sources.filter((s) => s.status === "unavailable").map((s) => s.name),
  ).toEqual(["Reddit", "X", "Google Trends"]);
  const news = bundle.sources[0];
  expect(news.status).toBe("available");
  if (news.status !== "available") return;
  const agg = aggregateSentiment(news.items, 7, "2026-10-31", news.minSample);
  expect(agg.status).toBe("ok");
  expect(agg.counts).toMatchObject({ positive: 6, negative: 6 });
});
