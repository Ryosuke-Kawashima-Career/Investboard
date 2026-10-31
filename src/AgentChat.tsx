import { useEffect, useRef, useState } from "react";
import { Bot, ExternalLink, SendHorizontal, Trash2 } from "lucide-react";
import {
  MAX_QUESTIONS,
  answer,
  type AgentContext,
  type AgentReply,
} from "./agent";
import { askResearchAgent, loadAgentStatus, type AgentStatus } from "./service";

type Turn = {
  id: number;
  question: string;
  reply: AgentReply;
  /** Set when a model wrote the answer. */
  ai?: { provider: string; model: string };
  pending?: boolean;
  notice?: string;
};
const suggestions = (real: boolean) => [
  "How has the price moved?",
  real ? "What is the headline tone?" : "What is the sentiment?",
  real ? "Any recent headlines?" : "Any news or risks?",
  "Should I buy?",
];
const fallbackNotice: Record<string, string> = {
  AGENT_UNAVAILABLE: "No AI provider key is configured",
  AGENT_DAILY_CAP: "Today's AI question limit is reached",
  AGENT_PROVIDER_FAILED: "The AI providers did not respond",
};

export function AgentChat({
  ctx,
  symbol,
  companyId,
}: {
  ctx: AgentContext;
  symbol: string;
  /** Real mode only: enables the server-side LLM agent when a key is configured. */
  companyId?: string;
}) {
  const real = !ctx.sentiment.synthetic;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const nextId = useRef(0);
  useEffect(() => {
    if (!real || !companyId) return;
    const controller = new AbortController();
    loadAgentStatus(controller.signal)
      .then(setStatus)
      .catch(() => setStatus(null));
    return () => controller.abort();
  }, [real, companyId]);
  const llm = real && companyId && status?.available ? status : null;
  const update = (id: number, patch: Partial<Turn>) =>
    setTurns((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  function ask(question: string) {
    const q = question.trim().slice(0, 500);
    if (!q) return;
    const id = nextId.current++;
    const local = answer(q, ctx, turns.length);
    // Refusals and the session cap are decided locally; nothing is sent.
    const remote = llm && local.kind !== "refusal" && local.kind !== "cap";
    setTurns((t) => [
      ...t,
      { id, question: q, reply: local, pending: !!remote },
    ]);
    setDraft("");
    if (!remote) return;
    askResearchAgent(companyId!, q)
      .then((r) =>
        update(id, {
          pending: false,
          reply: {
            kind: r.kind,
            text: r.text,
            period: r.period,
            citations: r.citations.map((c) => ({
              label: `[${c.id}] ${c.label}`,
              href: c.href,
            })),
          },
          ai: r.provider
            ? { provider: r.provider, model: r.model! }
            : undefined,
        }),
      )
      .catch((e: Error) =>
        update(id, {
          pending: false,
          notice: `${fallbackNotice[e.message] ?? "The AI agent is unavailable"}; rule-based answer shown.`,
        }),
      );
  }
  const capped = turns.length >= MAX_QUESTIONS;
  const badge = (t: Turn) =>
    t.ai
      ? `AI-generated · ${t.ai.provider} ${t.ai.model}`
      : real
        ? "Rule-based answer"
        : "AI-generated · demo";
  return (
    <section className="agent-chat" aria-labelledby="agent-title">
      <div className="sentiment-head">
        <div>
          <div className="eyebrow">
            <Bot size={12} /> RESEARCH AGENT ·{" "}
            {!real ? "PREVIEW" : llm ? "AI" : "RULE-BASED"}
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
      {llm ? (
        <p className="sentiment-banner real">
          <Bot size={14} /> AI answers ({llm.providers[0].name}{" "}
          {llm.providers[0].model}) use only the stored prices, signals and
          headlines for this company, cited by id. No web access. Research only:
          no advice, targets or forecasts. AI can be wrong; check the cited
          sources.
        </p>
      ) : real ? (
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
            {t.pending ? (
              <div className="agent-a pending">
                <span className="agent-badge">AI</span>
                <p>
                  <span className="loading-spinner small" /> Reading the stored
                  data…
                </p>
              </div>
            ) : (
              <div className={`agent-a ${t.reply.kind}`}>
                <span className="agent-badge">{badge(t)}</span>
                {t.notice && <p className="agent-notice">{t.notice}</p>}
                <p>{t.reply.text}</p>
                {t.reply.period && (
                  <p className="small muted">
                    Data period {t.reply.period}
                    {real ? "" : ` · Retrieved ${ctx.today} (synthetic)`}
                  </p>
                )}
                {t.ai &&
                  t.reply.kind === "answer" &&
                  !t.reply.citations.length && (
                    <p className="agent-notice">
                      This answer cites no stored data; treat it with caution.
                    </p>
                  )}
                {t.reply.citations.length > 0 && (
                  <ul className="agent-cites">
                    {t.reply.citations.map((c, i) => (
                      <li key={i}>
                        {c.href ? (
                          <a
                            href={c.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
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
            )}
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
