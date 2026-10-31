import { useMemo, useState } from "react";
import {
  AlertTriangle,
  FlaskConical,
  MessagesSquare,
  TrendingUp,
} from "lucide-react";
import {
  LABELS,
  MIN_AUTHORS,
  MIN_ITEMS,
  aggregateSentiment,
  syntheticSentiment,
  type SentimentAggregate,
  type SentimentBundle,
} from "./sentiment";

const flagText = {
  "author-concentration":
    "One author posted over 25% of items — possible manipulation",
  "volume-spike": "Unusual one-day volume spike — possible manipulation",
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
  const agg = aggregateSentiment(source.items, days, today);
  const change = agg.positiveShareChange;
  return (
    <article className="sentiment-source">
      <h3>{source.name}</h3>
      <p className="small muted">
        {agg.from} – {agg.to} · {agg.retrieved} items from {agg.authors} authors
        · {agg.duplicatesRemoved} reposts removed
      </p>
      {agg.status === "insufficient" ? (
        <p className="sentiment-state">
          Not enough data
          <span className="small muted">
            {" "}
            · needs {MIN_ITEMS} items from {MIN_AUTHORS} authors
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
          <summary>Cited posts ({agg.cited.length})</summary>
          <ul>
            {agg.cited.map((c) => (
              <li key={c.id}>
                <span className={`dot ${c.label}`} /> {c.text}{" "}
                <span className="small muted">
                  · {c.date} · {c.label}
                  {c.url.startsWith("https://") ? (
                    <a href={c.url} target="_blank" rel="noreferrer">
                      {" "}
                      open
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

function TrendsCard({ bundle }: { bundle: SentimentBundle }) {
  const pts = bundle.trends.points;
  const w = 300,
    h = 56;
  const line = pts
    .map((p, i) => `${(i / (pts.length - 1)) * w},${h - (p.value / 100) * h}`)
    .join(" ");
  return (
    <article className="sentiment-source">
      <h3>
        <TrendingUp size={15} /> {bundle.trends.name}
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

export function SentimentPanel({
  listingId,
  today,
  real = false,
}: {
  listingId: string;
  today: string;
  real?: boolean;
}) {
  const [days, setDays] = useState(7);
  // Real mode never shows fixtures: no social source has passed TASK-12.
  const preview = !real;
  const bundle = useMemo(
    () => syntheticSentiment(listingId, today),
    [listingId, today],
  );
  return (
    <section className="sentiment-panel" aria-labelledby="sentiment-title">
      <div className="sentiment-head">
        <div>
          <div className="eyebrow">
            <MessagesSquare size={12} /> SOCIAL ATTENTION & SENTIMENT
          </div>
          <h2 id="sentiment-title">What people are saying</h2>
        </div>
        {preview && (
          <div className="macos-segmented-track" aria-label="Sentiment period">
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
      {!preview ? (
        <div className="sentiment-empty">
          <p>
            <strong>Unavailable.</strong> No social source has passed the
            permission review yet, so no real sentiment is shown.
          </p>
        </div>
      ) : (
        <>
          <p className="sentiment-banner">
            <FlaskConical size={14} /> Synthetic fixture — invented posts and
            counts for interface review. Not real sentiment, not a forecast, and
            never used in discovery ranking.
          </p>
          <div className="sentiment-grid">
            {bundle.sources.map((_, i) => (
              <SourceCard
                key={i}
                bundle={bundle}
                index={i}
                days={days}
                today={today}
              />
            ))}
            <TrendsCard bundle={bundle} />
          </div>
          <p className="small muted">
            Classifier {bundle.classifier.name} {bundle.classifier.version} ·
            Accuracy:{" "}
            {bundle.classifier.accuracy == null
              ? "not yet measured on the labeled evaluation set"
              : `${bundle.classifier.accuracy}%`}
          </p>
        </>
      )}
    </section>
  );
}
