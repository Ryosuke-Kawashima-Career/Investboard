/** Aggregate supplied OHLC observations without inventing missing values. */
import type { HistoryPoint } from "./data";
export type HistoryBar = HistoryPoint & { endDate: string };
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
