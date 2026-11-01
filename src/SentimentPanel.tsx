import { useState } from "react";
import {
  AlertTriangle,
  FlaskConical,
  MessagesSquare,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import {
  LABELS,
  MIN_AUTHORS,
  MIN_ITEMS,
  aggregateSentiment,
  type SentimentAggregate,
  type SentimentBundle,
} from "./sentiment";
import type { ToneEvaluation } from "./tone";

const flagText = {
  "author-concentration":
    "One author or publisher supplied over 25% of items — check for one-sided or coordinated coverage",
  "volume-spike":
    "Unusual one-day spike — can mean a results day or coordinated posting",
};

function LabelBar({ agg }: { agg: SentimentAggregate }) {
  const counts = agg.counts!;
  return (
    <>
      <div
        className="sentiment-bar"
        role="img"
        aria-label={LABELS.map((l) => `${l} ${counts[l]}`).join(", ")}
      >
        {LABELS.map(
          (l) =>
            counts[l] > 0 && (
              <span
                key={l}
                className={`seg ${l}`}
                style={{ flexGrow: counts[l] }}
              />
            ),
        )}
      </div>
      <ul className="sentiment-legend">
        {LABELS.map((l) => (
          <li key={l}>
            <i className={`dot ${l}`} />
            {l} <strong>{counts[l]}</strong>
          </li>
        ))}
      </ul>
    </>
  );
}

function SourceCard({
  bundle,
  index,
  days,
  today,
}: {
  bundle: SentimentBundle;
  index: number;
  days: number;
  today: string;
}) {
  const source = bundle.sources[index];
  if (source.status === "unavailable")
    return (
      <article className="sentiment-source unavailable">
        <h3>{source.name}</h3>
        <p className="sentiment-state">Source unavailable</p>
        <p className="small muted">{source.reason}. Not counted as neutral.</p>
      </article>
    );
  const min = source.minSample ?? { items: MIN_ITEMS, authors: MIN_AUTHORS };
  const [item, author] = bundle.synthetic
    ? ["items", "authors"]
    : ["headlines", "publishers"];
  const agg = aggregateSentiment(source.items, days, today, min);
  const change = agg.positiveShareChange;
  return (
    <article className="sentiment-source">
      <h3>{source.name}</h3>
      <p className="small muted">
        {agg.from} – {agg.to} · {agg.retrieved} {item} from {agg.authors}{" "}
        {author} · {agg.duplicatesRemoved} duplicates removed
      </p>
      {agg.status === "insufficient" ? (
        <p className="sentiment-state">
          Not enough data
          <span className="small muted">
            {" "}
            · needs {min.items} {item} from {min.authors} {author}
          </span>
        </p>
      ) : (
        <>
          <LabelBar agg={agg} />
          <p className="small">
            Positive share vs prior {days} days:{" "}
            {change == null ? (
              "prior period below minimum sample"
            ) : (
              <strong className={change >= 0 ? "up" : "down"}>
                {change >= 0 ? "↗ up" : "↘ down"} {Math.abs(change).toFixed(1)}{" "}
                pts
              </strong>
            )}
          </p>
        </>
      )}
      {agg.flags.map((f) => (
        <p className="sentiment-flag" key={f}>
          <AlertTriangle size={13} /> {flagText[f]}
        </p>
      ))}
      {agg.cited.length > 0 && (
        <details className="sentiment-cited">
          <summary>
            Cited {bundle.synthetic ? "posts" : "headlines"} ({agg.cited.length}
            )
          </summary>
          <ul>
            {agg.cited.map((c) => (
              <li key={c.id}>
                <span className={`dot ${c.label}`} /> {c.text}{" "}
                <span className="small muted">
                  · {c.author} · {c.date} · {c.label}
                  {c.url.startsWith("https://") ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      {" "}
                      open ↗
                    </a>
                  ) : (
                    " · synthetic, no link"
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="small muted">Retrieved {source.retrievedAt}</p>
    </article>
  );
}

function TrendsCard({
  trends,
}: {
  trends: NonNullable<SentimentBundle["trends"]>;
}) {
  const pts = trends.points;
  const w = 300,
    h = 56;
  const line = pts
    .map((p, i) => `${(i / (pts.length - 1)) * w},${h - (p.value / 100) * h}`)
    .join(" ");
  return (
    <article className="sentiment-source">
      <h3>
        <TrendingUp size={15} /> {trends.name}
      </h3>
      <p className="small muted">
        Relative search interest (0–100), last 90 days — attention, not
        sentiment.
      </p>
      <svg
        className="trends-line"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Relative interest from ${pts[0].value} to ${pts.at(-1)!.value}`}
      >
        <polyline points={line} />
      </svg>
      <p className="small">
        Latest {pts.at(-1)!.value} · 90-day range{" "}
        {Math.min(...pts.map((p) => p.value))}–
        {Math.max(...pts.map((p) => p.value))}
      </p>
    </article>
  );
}

function EvaluationDetails({ evaluation }: { evaluation: ToneEvaluation }) {
  return (
    <details className="sentiment-eval">
      <summary>
        headline-lexicon-v1 · {(evaluation.accuracy * 100).toFixed(0)}% accuracy
        on {evaluation.n} labeled headlines
      </summary>
      <p className="small muted">
        Labels were assigned by the AI assistant and the word lists were written
        after viewing these headlines, so this is in-sample and optimistic. Rows
        are the assigned label; columns are the classifier's output.
      </p>
      <div className="eval-scroll">
        <table className="eval-matrix">
          <thead>
            <tr>
              <th scope="col">Labeled \ Classified</th>
              {LABELS.map((l) => (
                <th scope="col" key={l}>
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LABELS.map((a) => (
              <tr key={a}>
                <th scope="row">{a}</th>
                {LABELS.map((p) => (
                  <td key={p} className={a === p ? "diag" : ""}>
                    {evaluation.matrix[a][p]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function SentimentPanel({
  bundle,
  today,
  evaluation,
  threshold = 0,
}: {
  bundle: SentimentBundle;
  today: string;
  evaluation?: ToneEvaluation;
  threshold?: number;
}) {
  const [days, setDays] = useState(7);
  const real = !bundle.synthetic;
  const accuracy = bundle.classifier.accuracy;
  const withheld = real && (accuracy == null || accuracy < threshold);
  const unavailable = bundle.sources
    .filter((s) => s.status === "unavailable")
    .map((s) => s.name);
  return (
    <section className="sentiment-panel" aria-labelledby="sentiment-title">
      <div className="sentiment-head">
        <div>
          <div className="eyebrow">
            {real ? <Newspaper size={12} /> : <MessagesSquare size={12} />}{" "}
            {real ? "NEWS HEADLINE TONE" : "SOCIAL ATTENTION & SENTIMENT"}
          </div>
          <h2 id="sentiment-title">
            {real ? "What headlines say" : "What people are saying"}
          </h2>
        </div>
        {!withheld && (
          <div className="macos-segmented-track" aria-label="Tone period">
            {[7, 30].map((d) => (
              <button
                key={d}
                className={`macos-segmented-btn ${days === d ? "active" : ""}`}
                aria-pressed={days === d}
                onClick={() => setDays(d)}
              >
                {d}D
              </button>
            ))}
          </div>
        )}
      </div>
      {!real && (
        <p className="sentiment-banner">
          <FlaskConical size={14} /> Synthetic fixture — invented posts and
          counts for interface review. Not real sentiment, not a forecast, and
          never used in discovery ranking.
        </p>
      )}
      {withheld ? (
        <div className="sentiment-empty">
          <p>
            <strong>Withheld.</strong> The classifier is below the agreed
            accuracy threshold.
          </p>
        </div>
      ) : (
        <div className="sentiment-grid">
          {bundle.sources.map((s, i) =>
            s.status === "unavailable" ? null : (
              <SourceCard
                key={i}
                bundle={bundle}
                index={i}
                days={days}
                today={today}
              />
            ),
          )}
          {bundle.trends && <TrendsCard trends={bundle.trends} />}
        </div>
      )}
      {unavailable.length > 0 && (
        <p className="sentiment-unavailable">
          Source unavailable: {unavailable.join(" · ")}. Not counted as neutral.
        </p>
      )}
      {evaluation ? (
        <EvaluationDetails evaluation={evaluation} />
      ) : (
        <p className="small muted">
          Classifier {bundle.classifier.name} {bundle.classifier.version} ·
          Accuracy:{" "}
          {accuracy == null
            ? "not yet measured on the labeled evaluation set"
            : `${(accuracy * 100).toFixed(0)}% (in-sample)`}
        </p>
      )}
    </section>
  );
}
