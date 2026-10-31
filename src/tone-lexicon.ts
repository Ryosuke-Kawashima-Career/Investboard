// headline-lexicon-v1 word lists (spec 1.7.0). Dependency-free so the server
// can import it directly under Node type stripping.
type ToneLabel =
  "positive" | "negative" | "neutral" | "mixed" | "unclassifiable";
const positive =
  /\b(rise[sn]?|rising|rose|jump(s|ed)?|surge[sd]?|soar(s|ed)?|rall(y|ies|ied)|gains?|gained|climbs?|climbed|beats?|record|wins?|won|secures?|secured|upgraded?|upgrades|strong|bullish|shines?|recover(s|y|ed)?|expand(s|ed)?|expansion|boost(s|ed)?|outperforms?|nod|approv(al|es|ed)|resilient|highest|breaks above|gainers|upside|picks|powers|tops?|growth|hikes? targets?|target raised)\b|\bup (by )?\d[\d.,]*\s?(%|per ?cent\b|pc\b)/i;
const negative =
  /\b(falls?|falling|fell|drop(s|ped)?|declin(e|es|ed)|slips?|slipped|slump(s|ed)?|plunge[sd]?|crash(es|ed)?|tanks?|tanked|losses|loss|lost|miss(es|ed)?|missing|downgrades?|downgraded|cuts?|probe|investigation|penalty|halt|lapses|weak(er)?|in red|52-week low|headwinds|uncertain(ty)?|challenges|caution|violations?|non-compliance|withholds?|concerns|dips?|slows?|slowdown|undoing|unanswered|dull|lower|underperforms?)\b|\bdown (by )?\d[\d.,]*\s?(%|per ?cent\b|pc\b)/i;

export function classifyHeadline(title: string): ToneLabel {
  const letters = title.match(/\p{L}/gu) ?? [];
  const latin = letters.filter((c) => /\p{Script=Latin}/u.test(c)).length;
  if (!letters.length || latin / letters.length < 0.7) return "unclassifiable";
  const pos = positive.test(title),
    neg = negative.test(title);
  return pos && neg ? "mixed" : pos ? "positive" : neg ? "negative" : "neutral";
}
