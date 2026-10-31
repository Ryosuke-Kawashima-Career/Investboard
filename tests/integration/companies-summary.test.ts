import { expect, it } from "vitest";
import { Store } from "../../server/store";
import { route } from "../../server/api";
import { manifest, normalizeDaily } from "../../server/domain";
import { importEvidence } from "../../server/evidence";
import { daily, evidence } from "./helpers";

// Three months of sessions so the list summary has something to trim.
function longDaily() {
  const raw = daily();
  const r = raw.chart.result[0];
  const n = 90;
  r.timestamp = Array.from(
    { length: n },
    (_, i) => Date.parse("2026-08-01T03:45:00Z") / 1000 + i * 86400,
  );
  const q = r.indicators.quote[0];
  q.open = Array(n).fill(100);
  q.high = Array(n).fill(110);
  q.low = Array(n).fill(90);
  q.close = Array.from({ length: n }, (_, i) => 100 + i / 10);
  q.volume = Array(n).fill(1000);
  return raw;
}

it("lists compact summaries and serves full history and evidence per company", () => {
  const store = new Store(":memory:");
  const now = new Date("2026-10-31");
  store.saveHistory(normalizeDaily(longDaily(), now), "2026-10-31T00:00:00Z");
  importEvidence(store, evidence());
  const read = (path: string) =>
    route(store, new URL("http://local" + path), now).body.data;
  const summary = read("/api/companies").find((l: any) => l.id === manifest.id);
  expect(summary.detail).toBe("summary");
  expect(summary.evidence).toEqual([]);
  expect(summary.history[0].date >= "2026-09-30").toBe(true);
  expect(summary.signals.length).toBeGreaterThan(0);
  const full = read(`/api/companies/${manifest.companyId}`);
  expect(full.detail).toBeUndefined();
  expect(full.history[0].date).toBe("2026-08-01");
  expect(full.evidence.length).toBeGreaterThan(0);
  store.close();
});
