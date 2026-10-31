// REQ-12 agent preview: scripted, read-only answers over the page's synthetic
// data. No model or web access; TASK-14 replaces this with a guarded model.
import { summarizePeriod } from "./chart-data";
import { money, type Listing } from "./data";
import { aggregateSentiment, type SentimentBundle } from "./sentiment";

export const MAX_QUESTIONS = 10;
export type AgentContext = {
  listing: Listing;
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

// User text is matched against fixed intents only; it is never executed as instructions.
const advice =
  /\b(buy|buying|sell|selling|hold|exit|invest|target|recommend\w*|should i|predict\w*|forecast\w*|next (week|month|year)|multibagger)\b|\bwill (it|the stock|the price|\w+) (go|rise|fall|drop|climb)/i;
const intents = {
  price:
    /\b(price|move|moved|movement|chart|change|perform\w*|return|high|low|quote)\b/i,
  sentiment:
    /\b(sentiment|reddit|social|people|mood|opinion|trends?|attention|buzz|x)\b/i,
  evidence:
    /\b(news|evidence|risk|risks|disclosure|source|why|story|counterpoint)\b/i,
};

function evidenceCitations(listing: Listing): Citation[] {
  return listing.evidence.map((e) => ({
    label: `${e.title} · ${e.publisher} · synthetic note`,
    href: e.url,
  }));
}

function priceAnswer({ listing }: AgentContext): AgentReply {
  const from = listing.history.at(-1)?.date ?? "";
  const start = new Date(`${from}T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - 1);
  const cut = start.toISOString().slice(0, 10);
  const s = summarizePeriod(listing.history.filter((p) => p.date >= cut));
  const citations = [
    { label: `${listing.quote.source} (synthetic price history)` },
  ];
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
      `Over 1M the synthetic close moved ${dir} ${money(Math.abs(s.change))}` +
      `${s.percent == null ? "" : ` (${Math.abs(s.percent).toFixed(2)}%)`}, from ${money(s.firstClose)} to ${money(s.lastClose)} across ${s.sessions} sessions. ` +
      `High ${money(s.high.value)} on ${s.high.date}; low ${money(s.low.value)} on ${s.low.date}. This describes the past, not what comes next.`,
    period: `${s.firstDate} – ${s.lastDate}`,
    citations,
  };
}

function sentimentAnswer({ sentiment, today }: AgentContext): AgentReply {
  const parts: string[] = [];
  const citations: Citation[] = [];
  let period = "";
  let enough = false;
  for (const source of sentiment.sources) {
    if (source.status === "unavailable") {
      parts.push(
        `${source.name} is unavailable: ${source.reason}. That is not neutral sentiment.`,
      );
      continue;
    }
    const agg = aggregateSentiment(source.items, 30, today);
    period = `${agg.from} – ${agg.to}`;
    if (agg.status === "insufficient") {
      parts.push(
        `${source.name} has only ${agg.retrieved} items from ${agg.authors} authors in 30 days, below the minimum sample, so I won't describe its sentiment.`,
      );
    } else {
      enough = true;
      const c = agg.counts!;
      parts.push(
        `${source.name}, 30 days: ${c.positive} positive, ${c.negative} negative, ${c.neutral} neutral, ${c.mixed} mixed, ${c.unclassifiable} unclassifiable from ${agg.authors} authors.` +
          (agg.flags.length
            ? ` Flags: ${agg.flags.join(", ")} (possible manipulation).`
            : ""),
      );
    }
    citations.push(
      ...agg.cited.map((i) => ({
        label: `${source.name} · ${i.date} · ${i.label} · synthetic post`,
      })),
    );
  }
  const latest = sentiment.trends.points.at(-1)!.value;
  parts.push(
    `${sentiment.trends.name} relative interest is ${latest}/100 — attention, not sentiment.`,
  );
  parts.push(
    `Classifier accuracy has not been measured yet, so treat labels with caution.`,
  );
  return {
    kind: enough ? "answer" : "missing",
    text: parts.join(" "),
    period,
    citations,
  };
}

function evidenceAnswer({ listing }: AgentContext): AgentReply {
  const lines = listing.evidence.map(
    (e) =>
      `${e.kind === "risk" ? "Counterpoint" : "Worth exploring"}: ${e.title}.`,
  );
  return {
    kind: listing.evidence.length ? "answer" : "missing",
    text: listing.evidence.length
      ? `${lines.join(" ")} These are illustrative notes; open the sources to judge them yourself.`
      : "No evidence is stored for this listing.",
    citations: evidenceCitations(listing),
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
      citations: evidenceCitations(ctx.listing),
    };
  if (intents.price.test(question)) return priceAnswer(ctx);
  if (intents.sentiment.test(question)) return sentimentAnswer(ctx);
  if (intents.evidence.test(question)) return evidenceAnswer(ctx);
  return {
    kind: "help",
    text: "I can describe this listing's recent price movement, its stored evidence, or social sentiment and attention.",
    citations: [],
  };
}
