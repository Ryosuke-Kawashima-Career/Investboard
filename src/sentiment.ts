// REQ-11 sentiment aggregation. Pure and deterministic; fixtures are synthetic
// until the TASK-12 permission gate approves a live source.
export type SentimentLabel =
  "positive" | "negative" | "neutral" | "mixed" | "unclassifiable";
export const LABELS: SentimentLabel[] = [
  "positive",
  "negative",
  "neutral",
  "mixed",
  "unclassifiable",
];
export const MIN_ITEMS = 30;
export const MIN_AUTHORS = 10;
export type MinSample = { items: number; authors: number };
const DEFAULT_MIN: MinSample = { items: MIN_ITEMS, authors: MIN_AUTHORS };
const CONCENTRATION_SHARE = 0.25;
const SPIKE_RATIO = 3;

export type SentimentItem = {
  id: string;
  url: string;
  author: string;
  date: string;
  label: SentimentLabel;
  text: string;
};
export type SentimentFlag = "author-concentration" | "volume-spike";
export type SentimentAggregate = {
  days: number;
  from: string;
  to: string;
  status: "ok" | "insufficient";
  retrieved: number;
  authors: number;
  duplicatesRemoved: number;
  counts: Record<SentimentLabel, number> | null;
  positiveShareChange: number | null;
  flags: SentimentFlag[];
  cited: SentimentItem[];
};

const dayMs = 86_400_000;
const shift = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs)
    .toISOString()
    .slice(0, 10);

function window(items: SentimentItem[], from: string, to: string) {
  return items.filter((i) => i.date >= from && i.date <= to);
}
function tally(items: SentimentItem[]) {
  const counts = Object.fromEntries(LABELS.map((l) => [l, 0])) as Record<
    SentimentLabel,
    number
  >;
  for (const i of items) counts[i.label]++;
  return counts;
}
function sufficient(items: SentimentItem[], min: MinSample) {
  return (
    items.length >= min.items &&
    new Set(items.map((i) => i.author)).size >= min.authors
  );
}
// Share of positive among classified (non-unclassifiable) items, in percent.
function positiveShare(counts: Record<SentimentLabel, number>) {
  const classified = LABELS.reduce(
    (sum, l) => sum + (l === "unclassifiable" ? 0 : counts[l]),
    0,
  );
  return classified ? (counts.positive / classified) * 100 : null;
}

export function aggregateSentiment(
  raw: SentimentItem[],
  days: number,
  today: string,
  min: MinSample = DEFAULT_MIN,
): SentimentAggregate {
  const seen = new Set<string>();
  const unique = raw.filter((i) => !seen.has(i.url) && seen.add(i.url));
  const to = today,
    from = shift(today, -(days - 1));
  const current = window(unique, from, to);
  const prior = window(unique, shift(from, -days), shift(from, -1));
  const duplicatesRemoved = window(raw, from, to).length - current.length;
  const authorCounts = new Map<string, number>();
  for (const i of current)
    authorCounts.set(i.author, (authorCounts.get(i.author) ?? 0) + 1);
  const flags: SentimentFlag[] = [];
  const top = Math.max(0, ...authorCounts.values());
  if (current.length && top / current.length > CONCENTRATION_SHARE)
    flags.push("author-concentration");
  const perDay = Array.from(
    { length: days },
    (_, d) => current.filter((i) => i.date === shift(from, d)).length,
  );
  const peak = Math.max(...perDay);
  const rest = perDay.filter((_, d) => d !== perDay.indexOf(peak));
  const restMean = rest.length
    ? rest.reduce((a, b) => a + b, 0) / rest.length
    : 0;
  if (peak > Math.max(3, SPIKE_RATIO * restMean)) flags.push("volume-spike");
  const ok = sufficient(current, min);
  const counts = ok ? tally(current) : null;
  const nowShare = counts && positiveShare(counts);
  const priorShare = sufficient(prior, min)
    ? positiveShare(tally(prior))
    : null;
  return {
    days,
    from,
    to,
    status: ok ? "ok" : "insufficient",
    retrieved: current.length,
    authors: authorCounts.size,
    duplicatesRemoved,
    counts,
    positiveShareChange:
      nowShare != null && priorShare != null ? nowShare - priorShare : null,
    flags,
    cited: [...current]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3),
  };
}

export type SentimentSource =
  | {
      name: string;
      status: "available";
      retrievedAt: string;
      items: SentimentItem[];
      minSample?: MinSample;
    }
  | { name: string; status: "unavailable"; reason: string };
export type SentimentBundle = {
  synthetic: boolean;
  classifier: { name: string; version: string; accuracy: number | null };
  sources: SentimentSource[];
  trends: {
    name: string;
    status: "available";
    points: { date: string; value: number }[];
  } | null;
};

// Small seeded PRNG so each listing's fixture is stable across reloads.
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const templates: Record<SentimentLabel, string> = {
  positive: "Synthetic post: order book commentary sounds encouraging",
  negative: "Synthetic post: worried about margins after the last update",
  neutral: "Synthetic post: does anyone know the record date?",
  mixed: "Synthetic post: good revenue, but costs keep rising",
  unclassifiable: "Synthetic post: mixed Hindi-English text, not classified",
};

export function syntheticSentiment(
  listingId: string,
  today: string,
): SentimentBundle {
  const rand = rng(listingId);
  const bias = 0.3 + rand() * 0.35;
  const volume = 1 + Math.floor(rand() * 7);
  const items: SentimentItem[] = [];
  for (let d = 0; d < 60; d++) {
    const date = shift(today, -d);
    const n = Math.floor(rand() * volume);
    for (let k = 0; k < n; k++) {
      const r = rand();
      const label: SentimentLabel =
        r < bias
          ? "positive"
          : r < bias + 0.25
            ? "negative"
            : r < bias + 0.5
              ? "neutral"
              : r < 0.95
                ? "mixed"
                : "unclassifiable";
      const id = `${listingId}-${d}-${k}`;
      items.push({
        id,
        url: `synthetic://reddit/${id}`,
        author: `synthetic_user_${Math.floor(rand() * 24)}`,
        date,
        label,
        text: templates[label],
      });
      if (rand() < 0.05) items.push({ ...items.at(-1)!, id: `${id}-repost` });
    }
  }
  let level = 30 + rand() * 40;
  const points = Array.from({ length: 90 }, (_, i) => {
    level = Math.min(100, Math.max(0, level + (rand() - 0.5) * 12));
    return { date: shift(today, i - 89), value: Math.round(level) };
  });
  return {
    synthetic: true,
    classifier: {
      name: "lexicon-baseline",
      version: "v0-fixture",
      accuracy: null,
    },
    sources: [
      {
        name: "Reddit",
        status: "available",
        retrievedAt: `${today} 18:00 IST`,
        items,
      },
      {
        name: "X",
        status: "unavailable",
        reason: "Paid API access not approved (permission gate pending)",
      },
    ],
    trends: { name: "Google Trends", status: "available", points },
  };
}
