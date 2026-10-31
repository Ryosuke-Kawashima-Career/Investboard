// REQ-11 news headline tone (spec 1.7.0): a deterministic lexicon over stored
// Google News headlines. Describes what headlines say, not public sentiment.
import evalSet from "../dev/data/headline-tone-eval.json";
import {
  LABELS,
  type SentimentBundle,
  type SentimentItem,
  type SentimentLabel,
} from "./sentiment";

export const TONE_VERSION = "headline-lexicon-v1";
/** Provisional enabling threshold agreed in spec 1.7.0. */
export const TONE_THRESHOLD = 0.6;
export const NEWS_MIN_SAMPLE = { items: 10, authors: 5 };
export const toneEval = evalSet as {
  description: string;
  labeledBy: string;
  items: { company: string; title: string; label: SentimentLabel }[];
};

const positive =
  /\b(rise[sn]?|rising|rose|jump(s|ed)?|surge[sd]?|soar(s|ed)?|rall(y|ies|ied)|gains?|gained|climbs?|climbed|beats?|record|wins?|won|secures?|secured|upgraded?|upgrades|strong|bullish|shines?|recover(s|y|ed)?|expand(s|ed)?|expansion|boost(s|ed)?|outperforms?|nod|approv(al|es|ed)|resilient|highest|breaks above|gainers|upside|picks|powers|tops?|growth|hikes? targets?|target raised)\b|\bup (by )?\d[\d.,]*\s?(%|per ?cent\b|pc\b)/i;
const negative =
  /\b(falls?|falling|fell|drop(s|ped)?|declin(e|es|ed)|slips?|slipped|slump(s|ed)?|plunge[sd]?|crash(es|ed)?|tanks?|tanked|losses|loss|lost|miss(es|ed)?|missing|downgrades?|downgraded|cuts?|probe|investigation|penalty|halt|lapses|weak(er)?|in red|52-week low|headwinds|uncertain(ty)?|challenges|caution|violations?|non-compliance|withholds?|concerns|dips?|slows?|slowdown|undoing|unanswered|dull|lower|underperforms?)\b|\bdown (by )?\d[\d.,]*\s?(%|per ?cent\b|pc\b)/i;

export function classifyHeadline(title: string): SentimentLabel {
  const letters = title.match(/\p{L}/gu) ?? [];
  const latin = letters.filter((c) => /\p{Script=Latin}/u.test(c)).length;
  if (!letters.length || latin / letters.length < 0.7) return "unclassifiable";
  const pos = positive.test(title),
    neg = negative.test(title);
  return pos && neg ? "mixed" : pos ? "positive" : neg ? "negative" : "neutral";
}

export type ToneEvaluation = {
  n: number;
  accuracy: number;
  /** matrix[actual][predicted] */
  matrix: Record<SentimentLabel, Record<SentimentLabel, number>>;
};
export function evaluateTone(
  items: { title: string; label: SentimentLabel }[] = toneEval.items,
): ToneEvaluation {
  const matrix = Object.fromEntries(
    LABELS.map((a) => [a, Object.fromEntries(LABELS.map((p) => [p, 0]))]),
  ) as ToneEvaluation["matrix"];
  let correct = 0;
  for (const i of items) {
    const predicted = classifyHeadline(i.title);
    matrix[i.label][predicted]++;
    if (predicted === i.label) correct++;
  }
  return {
    n: items.length,
    accuracy: items.length ? correct / items.length : 0,
    matrix,
  };
}

type NewsEvidence = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  type: string;
};
export function headlineToneBundle(
  evidence: NewsEvidence[],
  retrievedAt: string | null,
): SentimentBundle {
  const items: SentimentItem[] = evidence
    .filter((e) => e.type === "news-report" && e.publishedAt)
    .map((e) => ({
      id: e.id,
      url: e.url,
      author: e.publisher,
      date: e.publishedAt!.slice(0, 10),
      label: classifyHeadline(e.title),
      text: e.title,
    }));
  const pending = "Not yet approved by the source permission review";
  return {
    synthetic: false,
    classifier: {
      name: "headline-lexicon",
      version: "v1",
      accuracy: evaluateTone().accuracy,
    },
    sources: [
      {
        name: "Google News headlines",
        status: "available",
        retrievedAt: retrievedAt ?? "never",
        items,
        minSample: NEWS_MIN_SAMPLE,
      },
      { name: "Reddit", status: "unavailable", reason: pending },
      { name: "X", status: "unavailable", reason: pending },
      { name: "Google Trends", status: "unavailable", reason: pending },
    ],
    trends: null,
  };
}
