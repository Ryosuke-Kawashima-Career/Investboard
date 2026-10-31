import { useRef, useState } from "react";
import { Bot, ExternalLink, SendHorizontal, Trash2 } from "lucide-react";
import {
  MAX_QUESTIONS,
  answer,
  type AgentContext,
  type AgentReply,
} from "./agent";

type Turn = { id: number; question: string; reply: AgentReply };
const suggestions = (real: boolean) => [
  "How has the price moved?",
  real ? "What is the headline tone?" : "What is the sentiment?",
  real ? "Any recent headlines?" : "Any news or risks?",
  "Should I buy?",
];

export function AgentChat({
  ctx,
  symbol,
}: {
  ctx: AgentContext;
  symbol: string;
}) {
  const real = !ctx.sentiment.synthetic;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(0);
  function ask(question: string) {
    const q = question.trim().slice(0, 500);
    if (!q) return;
    setTurns((t) => [
      ...t,
      { id: nextId.current++, question: q, reply: answer(q, ctx, t.length) },
    ]);
    setDraft("");
  }
  const capped = turns.length >= MAX_QUESTIONS;
  return (
    <section className="agent-chat" aria-labelledby="agent-title">
      <div className="sentiment-head">
        <div>
          <div className="eyebrow">
            <Bot size={12} /> RESEARCH AGENT · {real ? "RULE-BASED" : "PREVIEW"}
          </div>
          <h2 id="agent-title">Ask about {symbol}</h2>
        </div>
        <button
          className="agent-clear"
          onClick={() => setTurns([])}
          disabled={!turns.length}
        >
          <Trash2 size={13} /> Clear conversation
        </button>
      </div>
      {real ? (
        <p className="sentiment-banner real">
          <Bot size={14} /> Rule-based answers from the stored prices and
          headlines on this page — no AI model, no web access. Research only: no
          advice, targets or forecasts.
        </p>
      ) : (
        <p className="sentiment-banner">
          <Bot size={14} /> Scripted demo over synthetic data — answers stand in
          for AI-generated ones. Research only: no advice, targets or forecasts.
        </p>
      )}
      <ol className="agent-log" aria-live="polite">
        {turns.map((t) => (
          <li key={t.id}>
            <p className="agent-q">{t.question}</p>
            <div className={`agent-a ${t.reply.kind}`}>
              <span className="agent-badge">
                {real ? "Rule-based answer" : "AI-generated · demo"}
              </span>
              <p>{t.reply.text}</p>
              {t.reply.period && (
                <p className="small muted">
                  Data period {t.reply.period}
                  {real ? "" : ` · Retrieved ${ctx.today} (synthetic)`}
                </p>
              )}
              {t.reply.citations.length > 0 && (
                <ul className="agent-cites">
                  {t.reply.citations.map((c, i) => (
                    <li key={i}>
                      {c.href ? (
                        <a href={c.href} target="_blank" rel="noreferrer">
                          {c.label} <ExternalLink size={11} />
                        </a>
                      ) : (
                        c.label
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!turns.length && (
        <div className="agent-chips">
          {suggestions(real).map((s) => (
            <button key={s} className="agent-chip" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="agent-composer"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <input
          aria-label="Ask the research agent"
          placeholder={
            capped
              ? "Question limit reached"
              : "Ask about price, news or sentiment"
          }
          value={draft}
          maxLength={500}
          disabled={capped}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button aria-label="Send" disabled={capped || !draft.trim()}>
          <SendHorizontal size={16} />
        </button>
      </form>
      <p className="small muted">
        {turns.length}/{MAX_QUESTIONS} questions this session · Not stored after
        you leave the page.
      </p>
    </section>
  );
}
