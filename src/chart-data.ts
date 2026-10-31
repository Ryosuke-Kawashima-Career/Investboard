/** Aggregate supplied OHLC observations without inventing missing values. */
import type { HistoryPoint } from "./data";
export type HistoryBar = HistoryPoint & { endDate: string };
export interface PeriodSummary {
  firstDate: string;
  lastDate: string;
  firstClose: number;
  lastClose: number;
  change: number;
  percent: number | null;
  high: { value: number; date: string };
  low: { value: number; date: string };
  sessions: number;
}
/** Change from first to last supplied close; null under two sessions, never 0%. */
export function summarizePeriod(points: HistoryPoint[]): PeriodSummary | null {
  if (points.length < 2) return null;
  const first = points[0],
    last = points[points.length - 1];
  let high = { value: -Infinity, date: first.date },
    low = { value: Infinity, date: first.date };
  for (const p of points) {
    const h = p.high ?? p.close,
      l = p.low ?? p.close;
    if (h > high.value) high = { value: h, date: p.date };
    if (l < low.value) low = { value: l, date: p.date };
  }
  const change = last.close - first.close;
  return {
    firstDate: first.date,
    lastDate: last.date,
    firstClose: first.close,
    lastClose: last.close,
    change,
    percent: first.close ? (change / first.close) * 100 : null,
    high,
    low,
    sessions: points.length,
  };
}
export function aggregateHistory(
  history: HistoryPoint[],
  period: string,
): HistoryBar[] {
  const groups = new Map<string, HistoryPoint[]>();
  for (const point of history) {
    let key = point.date;
    if (period === "1Y") key = point.date.slice(0, 7);
    else if (period === "6M") {
      const monday = new Date(`${point.date}T00:00:00Z`);
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      key = monday.toISOString().slice(0, 10);
    }
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const first = group[0],
      last = group[group.length - 1];
    const supplied = group.every(
      (p) =>
        p.open !== undefined && p.high !== undefined && p.low !== undefined,
    );
    return {
      ...first,
      endDate: last.date,
      close: last.close,
      open: supplied ? first.open : undefined,
      high: supplied ? Math.max(...group.map((p) => p.high!)) : undefined,
      low: supplied ? Math.min(...group.map((p) => p.low!)) : undefined,
    };
  });
}
