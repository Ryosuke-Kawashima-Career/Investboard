import { manifest, SOURCE_ID } from "./domain.ts";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
// The single-listing v1 store recorded its source as the RELIANCE provider symbol.
const LEGACY_SOURCE = "RELIANCE.NS";
export class Store {
  db: DatabaseSync;
  constructor(
    path = process.env.DATABASE_PATH || ".local/yahoo-research.sqlite",
  ) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS observations (date TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS listing_observations (listing TEXT NOT NULL, date TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (listing, date));
      CREATE TABLE IF NOT EXISTS evidence (url TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS requests (at INTEGER NOT NULL);
      INSERT OR IGNORE INTO migrations VALUES (1);`);
    const source = this.get("marketSource");
    if (source && source !== SOURCE_ID && source !== LEGACY_SOURCE) {
      this.db.close();
      throw new Error("SOURCE_STORE_MISMATCH");
    }
    if (!this.db.prepare("SELECT 1 FROM migrations WHERE version=2").get())
      this.migrateToUniverse();
    this.set("marketSource", SOURCE_ID);
  }
  // v2: per-listing observations and refresh state; v1 data belonged to NSE:RELIANCE.
  migrateToUniverse() {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec(`INSERT OR IGNORE INTO listing_observations
        SELECT '${manifest.id}', date, payload FROM observations;
        DELETE FROM observations;`);
      for (const [from, to] of [
        ["verifiedListing", `verified:${manifest.id}`],
        ["lastSuccessfulRefresh", `refreshed:${manifest.id}`],
      ]) {
        const value = this.get(from);
        if (value !== null && this.get(to) === null) this.set(to, value);
      }
      this.db.exec("DELETE FROM state WHERE key='verifiedListing'");
      this.db.exec("INSERT INTO migrations VALUES (2)");
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  get(key: string): any {
    const row = this.db.prepare("SELECT value FROM state WHERE key=?").get(key);
    return row ? JSON.parse(String(row.value)) : null;
  }
  set(key: string, value: unknown) {
    this.db
      .prepare("INSERT OR REPLACE INTO state VALUES (?,?)")
      .run(key, JSON.stringify(value));
  }
  history(listingId = manifest.id): any[] {
    return this.db
      .prepare(
        "SELECT payload FROM listing_observations WHERE listing=? ORDER BY date",
      )
      .all(listingId)
      .map((r) => JSON.parse(String(r.payload)));
  }
  evidence(companyId?: string): any[] {
    return this.db
      .prepare("SELECT payload FROM evidence ORDER BY url")
      .all()
      .map((r) => JSON.parse(String(r.payload)))
      .filter((e) => !companyId || e.companyId === companyId);
  }
  saveHistory(
    points: any[],
    at: string,
    verifiedListing: { id: string } = manifest,
  ) {
    const id = verifiedListing.id;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM listing_observations WHERE listing=?").run(id);
      this.set(`verified:${id}`, verifiedListing);
      const insert = this.db.prepare(
        "INSERT OR REPLACE INTO listing_observations VALUES (?,?,?)",
      );
      for (const p of points) insert.run(id, p.date, JSON.stringify(p));
      this.set(`refreshed:${id}`, at);
      this.set(`error:${id}`, null);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  // Search results are replaced per company; curated disclosures are never touched.
  replaceNews(companyId: string, items: { url: string }[]) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(
          "DELETE FROM evidence WHERE json_extract(payload,'$.companyId')=? AND json_extract(payload,'$.type')='news-report'",
        )
        .run(companyId);
      const insert = this.db.prepare(
        "INSERT OR IGNORE INTO evidence VALUES (?,?)",
      );
      for (const item of items) insert.run(item.url, JSON.stringify(item));
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  reserve(now: number, budget: number) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM requests WHERE at <= ?").run(now - 86400000);
      const n = Number(
        this.db.prepare("SELECT COUNT(*) AS n FROM requests").get()!.n,
      );
      if (n >= budget) throw new Error("REQUEST_BUDGET_EXHAUSTED");
      this.db.prepare("INSERT INTO requests VALUES (?)").run(now);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  acquireRefresh() {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if ((this.get("refreshLeaseUntil") || 0) > Date.now()) {
        this.db.exec("COMMIT");
        return false;
      }
      // Ten listings plus news with pauses and timeouts can exceed one minute.
      this.set("refreshLeaseUntil", Date.now() + 300000);
      this.db.exec("COMMIT");
      return true;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  releaseRefresh() {
    this.set("refreshLeaseUntil", 0);
  }
  close() {
    this.db.close();
  }
}
