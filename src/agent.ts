// REQ-12 agent: rule-based, read-only answers over the data already shown on
// the page (synthetic in demo, stored real data in real mode). No model or web
// access; TASK-14 replaces this with a guarded model.
import { summarizePeriod } from "./chart-data";
import { money, type HistoryPoint, type Listing } from "./data";
import {
  aggregateSentiment,
  syntheticSentiment,
  type SentimentBundle,
} from "./sentiment";
import type { RealListing } from "./service";
import { classifyHeadline, evaluateTone, headlineToneBundle } from "./tone";

export const MAX_QUESTIONS = 10;
export type AgentContext = {
  history: HistoryPoint[];
  historySource: string;
  /** note: short framing shown before the title, e.g. "Counterpoint" or a tone label. */
  evidence: {
    title: string;
    publisher: string;
    url: string;
    date: string | null;
    note: string;
  }[];
  sentiment: SentimentBundle;
  today: string;
};
export type Citation = { label: string; href?: string };
export type AgentReply = {
  kind: "answer" | "refusal" | "missing" | "cap" | "help";
  text: string;
  period?: string;
  citations: Citation[];
};

export function demoAgentContext(
  listing: Listing,
  today: string,
): AgentContext {
  return {
    history: listing.history,
    historySource: `${listing.quote.source} (synthetic price history)`,
    evidence: listing.evidence.map((e) => ({
      title: e.title,
      publisher: `${e.publisher} · synthetic note`,
      url: e.url,
      date: e.publishedAt,
      note: e.kind === "risk" ? "Counterpoint" : "Worth exploring",
    })),
    sentiment: syntheticSentiment(listing.id, today),
    today,
  };
}

export function realAgentContext(
  listing: RealListing,
  today: string,
): AgentContext {
  const evidence = [...listing.evidence]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .map((e) => ({
      title: e.title,
      publisher: e.publisher,
      url: e.url,
      date: e.publishedAt,
      note:
        e.type === "company-disclosure"
          ? "Official disclosure"
          : `${classifyHeadline(e.title)} tone`,
    }));
  return {
    history: listing.history,
    historySource: `${listing.quote.source} (observed end-of-day closes)`,
    evidence,
    sentiment: headlineToneBundle(listing.evidence, listing.newsRetrievedAt),
    today,
  };
}

// User text is matched against fixed intents only; it is never executed as instructions.
const advice =
  /\b(buy|buying|sell|selling|hold|exit|invest|target|recommend\w*|should i|predict\w*|forecast\w*|next (week|month|year)|multibagger)\b|\bwill (it|the stock|the price|\w+) (go|rise|fall|drop|climb)/i;
const intents = {
  price:
    /\b(price|move|moved|movement|chart|change|perform\w*|return|high|low|quote)\b/i,
  sentiment:
    /\b(sentiment|tone|reddit|social|people|mood|opinion|trends?|attention|buzz|x)\b/i,
  evidence:
    /\b(news|headlines?|evidence|risk|risks|disclosure|source|why|story|counterpoint)\b/i,
};

function evidenceCitations(ctx: AgentContext, limit = 5): Citation[] {
  return ctx.evidence.slice(0, limit).map((e) => ({
    label: `${e.title} · ${e.publisher}${e.date ? ` · ${e.date}` : ""}`,
    href: e.url,
  }));
}

function priceAnswer(ctx: AgentContext): AgentReply {
  const synthetic = ctx.sentiment.synthetic;
  const from = ctx.history.at(-1)?.date ?? "";
  const citations = [{ label: ctx.historySource }];
  if (!from)
    return {
      kind: "missing",
      text: "No price observations are stored for this listing.",
      citations,
    };
  const start = new Date(`${from}T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - 1);
  const cut = start.toISOString().slice(0, 10);
  const s = summarizePeriod(ctx.history.filter((p) => p.date >= cut));
  if (!s)
    return {
      kind: "missing",
      text: "There are fewer than two sessions in the last month, so I can't state a change.",
      citations,
    };
  const dir = s.change >= 0 ? "up" : "down";
  return {
    kind: "answer",
    text:
      `Over 1M the ${synthetic ? "synthetic" : "observed"} close moved ${dir} ${money(Math.abs(s.change))}` +
      `${s.percent == null ? "" : ` (${Math.abs(s.percent).toFixed(2)}%)`}, from ${money(s.firstClose)} to ${money(s.lastClose)} across ${s.sessions} sessions. ` +
      `High ${money(s.high.value)} on ${s.high.date}; low ${money(s.low.value)} on ${s.low.date}. This describes the past, not what comes next.`,
    period: `${s.firstDate} – ${s.lastDate}`,
    citations,
  };
}

function sentimentAnswer({ sentiment, today }: AgentContext): AgentReply {
  const synthetic = sentiment.synthetic;
  const [item, author, what] = synthetic
    ? ["items", "authors", "sentiment"]
    : ["headlines", "publishers", "headline tone"];
  const parts: string[] = [];
  const citations: Citation[] = [];
  const unavailable: string[] = [];
  let period = "";
  let enough = false;
  for (const source of sentiment.sources) {
    if (source.status === "unavailable") {
      unavailable.push(source.name);
      continue;
    }
    const agg = aggregateSentiment(source.items, 30, today, source.minSample);
    period = `${agg.from} – ${agg.to}`;
    if (agg.status === "insufficient") {
      parts.push(
        `${source.name} has only ${agg.retrieved} ${item} from ${agg.authors} ${author} in 30 days, below the minimum sample, so I won't describe its ${what}.`,
      );
    } else {
      enough = true;
      const c = agg.counts!;
      parts.push(
        `${source.name}, 30 days: ${c.positive} positive, ${c.negative} negative, ${c.neutral} neutral, ${c.mixed} mixed, ${c.unclassifiable} unclassifiable from ${agg.authors} ${author}.` +
          (agg.flags.length ? ` Flags: ${agg.flags.join(", ")}.` : ""),
      );
    }
    citations.push(
      ...agg.cited.map((i) => ({
        label: `${i.text} · ${i.author} · ${i.date} · ${i.label}`,
        href: i.url.startsWith("https://") ? i.url : undefined,
      })),
    );
  }
  if (unavailable.length)
    parts.push(
      `${unavailable.join(", ")} ${unavailable.length > 1 ? "are" : "is"} unavailable${synthetic ? "" : " pending the source permission review"}; that is not neutral sentiment.`,
    );
  if (sentiment.trends)
    parts.push(
      `${sentiment.trends.name} relative interest is ${sentiment.trends.points.at(-1)!.value}/100 — attention, not sentiment.`,
    );
  const acc = sentiment.classifier.accuracy;
  parts.push(
    acc == null
      ? "Classifier accuracy has not been measured yet, so treat labels with caution."
      : `The classifier scored ${(acc * 100).toFixed(0)}% on ${evaluateTone().n} labeled headlines (in-sample, so likely optimistic). Headlines are not public opinion.`,
  );
  return {
    kind: enough ? "answer" : "missing",
    text: parts.join(" "),
    period,
    citations,
  };
}

function evidenceAnswer(ctx: AgentContext): AgentReply {
  const shown = ctx.evidence.slice(0, 5);
  return {
    kind: shown.length ? "answer" : "missing",
    text: shown.length
      ? `${shown.map((e) => `${e.note}: ${e.title}.`).join(" ")} ${ctx.sentiment.synthetic ? "These are illustrative notes" : "These are headlines as published, not checked against the articles"}; open the sources to judge them yourself.`
      : "No evidence is stored for this listing.",
    citations: evidenceCitations(ctx),
  };
}

export function answer(
  question: string,
  ctx: AgentContext,
  asked: number,
): AgentReply {
  if (asked >= MAX_QUESTIONS)
    return {
      kind: "cap",
      text: `This session's limit of ${MAX_QUESTIONS} questions is reached. Clear the conversation to start again.`,
      citations: [],
    };
  if (advice.test(question))
    return {
      kind: "refusal",
      text: "I can't give buy, sell or hold advice, price targets or forecasts — I'm not a licensed adviser and the data here can't support them. I can show what the evidence says instead:",
      citations: evidenceCitations(ctx),
    };
  if (intents.price.test(question)) return priceAnswer(ctx);
  if (intents.sentiment.test(question)) return sentimentAnswer(ctx);
  if (intents.evidence.test(question)) return evidenceAnswer(ctx);
  return {
    kind: "help",
    text: `I can describe this listing's recent price movement, its stored evidence, or ${ctx.sentiment.synthetic ? "social sentiment and attention" : "the tone of its news headlines"}.`,
    citations: [],
  };
}
