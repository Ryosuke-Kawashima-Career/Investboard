import { it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../server/store";
import { route, snapshot } from "../../server/api";
import { normalizeDaily, SOURCE_ID } from "../../server/domain";
import { DatabaseSync } from "node:sqlite";
import { daily } from "./helpers";
it("migrates idempotently and retains observations and refresh state across restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "research-"));
  const path = join(dir, "test.sqlite");
  let store = new Store(path);
  store.saveHistory(
    normalizeDaily(daily(), new Date("2026-10-31")),
    "2026-10-31T00:00:00Z",
  );
  store.close();
  store = new Store(path);
  expect(store.history()).toHaveLength(30);
  expect(snapshot(store).meta.lastSuccessfulRefresh).toBe(
    "2026-10-31T00:00:00Z",
  );
  store.close();
  rmSync(dir, { recursive: true });
});
it("cold store returns unavailable with no synthetic fallback", () => {
  const s = new Store(":memory:");
  expect(snapshot(s).data).toEqual([]);
  expect(route(s, new URL("http://local/api/companies")).body.data).toEqual([]);
  expect(snapshot(s).meta.status).toBe("unavailable");
  s.close();
});
it("refuses a database owned by a different market source", () => {
  const dir = mkdtempSync(join(tmpdir(), "research-source-"));
  const path = join(dir, "test.sqlite");
  const store = new Store(path);
  store.set("marketSource", "RELIANCE.BSE");
  store.close();
  expect(() => new Store(path)).toThrow("SOURCE_STORE_MISMATCH");
  rmSync(dir, { recursive: true });
});
it("migrates a single-listing v1 store into the universe layout", () => {
  const dir = mkdtempSync(join(tmpdir(), "research-v1-"));
  const path = join(dir, "test.sqlite");
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE migrations (version INTEGER PRIMARY KEY);
    CREATE TABLE state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE observations (date TEXT PRIMARY KEY, payload TEXT NOT NULL);
    INSERT INTO migrations VALUES (1);`);
  const set = db.prepare("INSERT INTO state VALUES (?,?)");
  set.run("marketSource", JSON.stringify("RELIANCE.NS"));
  set.run("verifiedListing", JSON.stringify({ id: "NSE:RELIANCE" }));
  set.run("lastSuccessfulRefresh", JSON.stringify("2026-10-30T00:00:00Z"));
  const insert = db.prepare("INSERT INTO observations VALUES (?,?)");
  for (const p of normalizeDaily(daily(), new Date("2026-10-31")))
    insert.run(p.date, JSON.stringify(p));
  db.close();
  const store = new Store(path);
  expect(store.history("NSE:RELIANCE")).toHaveLength(30);
  expect(store.get("marketSource")).toBe(SOURCE_ID);
  const snap = snapshot(store, new Date("2026-10-31"));
  expect(snap.data.map((l) => l.id)).toEqual(["NSE:RELIANCE"]);
  expect(snap.meta.lastSuccessfulRefresh).toBe("2026-10-30T00:00:00Z");
  store.close();
  rmSync(dir, { recursive: true });
});
