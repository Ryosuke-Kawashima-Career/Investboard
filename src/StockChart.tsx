/** Accessible OHLC chart with calendar aggregation and a close-only line view. */
import { useEffect, useMemo, useRef, useState } from "react";
import { aggregateHistory } from "./chart-data";
import { money, type Listing } from "./data";
export function StockChart({
  listing,
  period,
  real = false,
  rangeFrom,
  rangeTo,
}: {
  listing: Pick<Listing, "id" | "name" | "history">;
  real?: boolean;
  rangeFrom?: string;
  rangeTo?: string;
  period: string;
}) {
  const [mode, setMode] = useState<"Candles" | "Line">("Candles");
  useEffect(() => {
    if (
      listing.history.some(
        (p) =>
          p.open === undefined || p.high === undefined || p.low === undefined,
      )
    )
      setMode("Line");
  }, [listing]);
  const [cursor, setCursor] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(760);
  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setChartWidth(Math.max(260, entry.contentRect.width)),
    );
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);
  const points = useMemo(
    () =>
      real
        ? listing.history.filter(
            (p) => p.date >= (rangeFrom || "") && p.date <= (rangeTo || "9999"),
          )
        : listing.history.slice(
            -(period === "1M" ? 22 : period === "6M" ? 130 : 260),
          ),
    [listing, period, real, rangeFrom, rangeTo],
  );
  const bars = useMemo(
    () =>
      mode === "Candles"
        ? aggregateHistory(points, period)
        : points.map((p) => ({ ...p, endDate: p.date })),
    [points, period, mode],
  );
  useEffect(() => setCursor(null), [listing.id, period, mode]);
  const activeIndex = Math.max(
    0,
    Math.min(cursor ?? bars.length - 1, bars.length - 1),
  );
  const active = bars[activeIndex];
  const interval =
    mode === "Line"
      ? "Daily closes"
      : period === "1M"
        ? "Daily bars"
        : period === "6M"
          ? "Weekly bars"
          : "Monthly bars";
  const supplied = bars.every(
    (p) => p.open !== undefined && p.high !== undefined && p.low !== undefined,
  );
  if (!active)
    return (
      <p className="storage-warning">
        Price history is unavailable for this period.
      </p>
    );
  const low =
    Math.min(
      ...bars.map((p) => (mode === "Candles" ? (p.low ?? p.close) : p.close)),
    ) * 0.995;
  const high =
    Math.max(
      ...bars.map((p) => (mode === "Candles" ? (p.high ?? p.close) : p.close)),
    ) * 1.005;
  const width = chartWidth,
    height = 260,
    left = width < 400 ? 43 : 58,
    right = 12,
    top = 14,
    bottom = 28;
  const plotWidth = width - left - right,
    plotHeight = height - top - bottom;
  const y = (value: number) =>
    top + ((high - value) / Math.max(high - low, 1)) * plotHeight;
  const x = (i: number) => left + ((i + 0.5) / bars.length) * plotWidth;
  const bodyWidth = Math.max(2, Math.min(18, (plotWidth / bars.length) * 0.58));
  const coords = bars.map((p, i) => `${x(i)},${y(p.close)}`).join(" ");
  return (
    <div className="stock-chart">
      <div className="chart-mode-row">
        <div className="macos-segmented-track" aria-label="Chart style">
          {(["Line", "Candles"] as const).map((value) => (
            <button
              key={value}
              className={`macos-segmented-btn ${mode === value ? "active" : ""}`}
              aria-pressed={mode === value}
              disabled={
                value === "Candles" &&
                points.some(
                  (p) =>
                    p.open === undefined ||
                    p.high === undefined ||
                    p.low === undefined,
                )
              }
              onClick={() => setMode(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="chart-interval">{interval}</span>
      </div>
      <div className="ohlc-readout" aria-live="polite" aria-atomic="true">
        <span className="ohlc-date">
          {active.date}
          {active.endDate !== active.date ? ` – ${active.endDate}` : ""}
        </span>
        <dl>
          {(mode === "Candles"
            ? (["Open", "High", "Low", "Close"] as const)
            : (["Close"] as const)
          ).map((label) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {active[
                  label.toLowerCase() as "open" | "high" | "low" | "close"
                ] === undefined
                  ? "Unavailable"
                  : money(
                      active[
                        label.toLowerCase() as "open" | "high" | "low" | "close"
                      ]!,
                    )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {mode === "Candles" && !supplied ? (
        <p className="storage-warning">
          OHLC data is unavailable. Choose Line to inspect supplied closing
          prices.
        </p>
      ) : (
        <div
          className="chart-inspector"
          ref={chartRef}
          role="group"
          aria-label="Inspect price chart"
          aria-describedby="chart-help"
          tabIndex={0}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            setCursor(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? bars.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        bars.length - 1,
                        activeIndex + (event.key === "ArrowLeft" ? -1 : 1),
                      ),
                    ),
            );
          }}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const svgX = ((event.clientX - rect.left) / rect.width) * width;
            setCursor(
              Math.max(
                0,
                Math.min(
                  bars.length - 1,
                  Math.floor(((svgX - left) / plotWidth) * bars.length),
                ),
              ),
            );
          }}
        >
          <svg
            className="chart-full candle-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${listing.name} ${real ? "observed" : "synthetic"} ${period} price history, INR, ${real ? "split-adjusted" : "unadjusted"} — ${mode.toLowerCase()}`}
            preserveAspectRatio="none"
          >
            {[0, 1, 2, 3].map((n) => {
              const value = high - ((high - low) * n) / 3,
                gy = y(value);
              return (
                <g key={n}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={gy}
                    y2={gy}
                    stroke="#e5ebe1"
                    strokeDasharray="3 5"
                  />
                  <text
                    x={left - 10}
                    y={gy + 3}
                    textAnchor="end"
                    className="chart-axis-label"
                  >
                    {Math.round(value).toLocaleString("en-IN")}
                  </text>
                </g>
              );
            })}
            <line
              x1={x(activeIndex)}
              x2={x(activeIndex)}
              y1={top}
              y2={height - bottom}
              stroke="#83977d"
              strokeDasharray="3 4"
              opacity=".6"
            />
            {mode === "Candles" ? (
              bars.map((p, i) => {
                const color = p.close >= p.open! ? "#36876a" : "#bd6b55";
                return (
                  <g
                    key={p.date}
                    opacity={cursor !== null && i !== activeIndex ? 0.65 : 1}
                  >
                    <title>{`${p.date} to ${p.endDate}: Open ${money(p.open!)}; High ${money(p.high!)}; Low ${money(p.low!)}; Close ${money(p.close)}`}</title>
                    <line
                      x1={x(i)}
                      x2={x(i)}
                      y1={y(p.high!)}
                      y2={y(p.low!)}
                      stroke={color}
                      strokeWidth="1.3"
                      vectorEffect="non-scaling-stroke"
                    />
                    <rect
                      className="candle-body"
                      x={x(i) - bodyWidth / 2}
                      y={Math.min(y(p.open!), y(p.close))}
                      width={bodyWidth}
                      height={Math.max(1.6, Math.abs(y(p.open!) - y(p.close)))}
                      rx="1.5"
                      fill={color}
                    />
                  </g>
                );
              })
            ) : (
              <>
                <polyline
                  points={coords}
                  stroke="#36876a"
                  strokeWidth="2.2"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={x(activeIndex)}
                  cy={y(active.close)}
                  r="4"
                  fill="#36876a"
                  stroke="white"
                  strokeWidth="2"
                />
              </>
            )}
            <text x={left} y={height - 5} className="chart-axis-label">
              {bars[0].date}
            </text>
            <text
              x={width - right}
              y={height - 5}
              textAnchor="end"
              className="chart-axis-label"
            >
              {bars.at(-1)!.endDate}
            </text>
          </svg>
        </div>
      )}
      {mode === "Candles" && (
        <div className="candle-legend">
          <span>
            <i className="candle-key rising" />
            Rising: close ≥ open
          </span>
          <span>
            <i className="candle-key falling" />
            Falling: close &lt; open
          </span>
        </div>
      )}
      <p id="chart-help" className="chart-help">
        {mode === "Candles" ? "Body: open to close. Wick: low to high. " : ""}
        Hover or focus the chart and use ← → to inspect.
      </p>
      <p className="chart-disclosure">
        INR ·{" "}
        {real ? "Yahoo split-adjusted observations" : "Unadjusted synthetic"}{" "}
        {mode === "Candles" ? "OHLC" : "closing prices"} ·{" "}
        {real
          ? "Supplied sessions retained; no gap filling."
          : "Weekends omitted; no interpolation."}{" "}
        {mode === "Candles" && period !== "1M"
          ? "First/last bars may cover partial periods."
          : ""}
      </p>
    </div>
  );
}
