import { safeProviderFetch, CHART_HOST } from "./transport.ts";
import { Store } from "./store.ts";
import { UNIVERSE, normalizeDaily, type ListingManifest } from "./domain.ts";
import { newsUrl, parseNews, NEWS_HOST } from "./news.ts";
export class ProviderError extends Error {
  retryable: boolean;
  constructor(code: string, retryable = false) {
    super(code);
    this.retryable = retryable;
  }
}
const safeCode = (e: unknown) =>
  e instanceof Error && /^[A-Z_]+$/.test(e.message)
    ? e.message
    : "REFRESH_FAILED";
export type ProviderOptions = {
  universe?: ListingManifest[];
  news?: boolean;
  pauseMs?: number;
};
export class Provider {
  store: Store;
  transport: typeof fetch;
  universe: ListingManifest[];
  news: boolean;
  pauseMs: number;
  running: Promise<void> | null = null;
  constructor(
    store: Store,
    transport = safeProviderFetch,
    options: ProviderOptions = {},
  ) {
    this.store = store;
    this.transport = transport;
    this.universe = options.universe ?? UNIVERSE;
    this.news = options.news ?? true;
    this.pauseMs = options.pauseMs ?? 400;
  }
  budget() {
    // Sized for one full refresh (chart + news per listing) plus retries; spec 1.8.0.
    const configured = Number(process.env.PROVIDER_DAILY_BUDGET || 220);
    return Number.isInteger(configured) && configured > 0
      ? Math.min(250, configured)
      : 220;
  }
  async request(url: URL, format: "json" | "text" = "json") {
    const cooldown = `blockedUntil:${url.hostname}`;
    if (this.store.get(cooldown) > Date.now())
      throw new ProviderError("PROVIDER_COOLDOWN");
    for (let attempt = 0; attempt < 2; attempt++) {
      this.store.reserve(Date.now(), this.budget());
      try {
        const response = await this.transport(url, {
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        });
        const retry = response.headers.get("retry-after");
        if (retry) {
          const seconds = Number(retry);
          const until = Number.isFinite(seconds)
            ? Date.now() + seconds * 1000
            : Date.parse(retry);
          this.store.set(
            cooldown,
            Number.isFinite(until)
              ? Math.max(Date.now(), until)
              : Date.now() + 86400000,
          );
        }
        if (response.status === 429) {
          if (!retry) this.store.set(cooldown, Date.now() + 86400000);
          throw new ProviderError("PROVIDER_QUOTA");
        }
        if (response.status >= 500)
          throw new ProviderError("PROVIDER_OUTAGE", !retry);
        if (!response.ok) throw new ProviderError("PROVIDER_ACCESS_DENIED");
        if (!response.body) throw new ProviderError("INVALID_PROVIDER_JSON");
        const reader = response.body.getReader();
        let size = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2000000) {
            await reader.cancel();
            throw new ProviderError("PROVIDER_RESPONSE_TOO_LARGE");
          }
          chunks.push(value);
        }
        const text = Buffer.concat(chunks).toString();
        if (format === "text") return text;
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new ProviderError("INVALID_PROVIDER_JSON");
        }
        if (!data || typeof data !== "object" || Array.isArray(data))
          throw new ProviderError("INVALID_PROVIDER_JSON");
        if (data.chart?.error) throw new ProviderError("PROVIDER_REJECTED");
        return data;
      } catch (error) {
        const safe =
          error instanceof ProviderError
            ? error
            : new ProviderError("PROVIDER_NETWORK_FAILURE", true);
        if (!safe.retryable || attempt === 1) throw safe;
        await new Promise((resolve) =>
          setTimeout(resolve, 250 + Math.random() * 500),
        );
      }
    }
  }
  refresh() {
    if (this.running) return this.running;
    this.running = this.perform().finally(() => {
      this.running = null;
    });
    return this.running;
  }
  pause() {
    return this.pauseMs
      ? new Promise((resolve) => setTimeout(resolve, this.pauseMs))
      : Promise.resolve();
  }
  async refreshListing(listing: ListingManifest) {
    try {
      const url = new URL(
        `https://${CHART_HOST}/v8/finance/chart/${listing.providerSymbol}`,
      );
      url.search = new URLSearchParams({
        range: "1y",
        interval: "1d",
        events: "history",
      }).toString();
      const raw = await this.request(url);
      const points = normalizeDaily(raw, new Date(), listing);
      const at = new Date().toISOString();
      this.store.saveHistory(points, at, { ...listing, verifiedAt: at } as any);
      return null;
    } catch (e) {
      const error = {
        code: safeCode(e),
        retryable: e instanceof ProviderError && e.retryable,
      };
      this.store.set(`error:${listing.id}`, error);
      return error;
    }
  }
  async refreshNews(listing: ListingManifest) {
    try {
      const xml = await this.request(newsUrl(listing), "text");
      const at = new Date().toISOString();
      this.store.replaceNews(listing.companyId, parseNews(xml, listing, at));
      this.store.set(`newsRefreshed:${listing.companyId}`, at);
      this.store.set(`newsError:${listing.companyId}`, null);
    } catch (e) {
      this.store.set(`newsError:${listing.companyId}`, { code: safeCode(e) });
    }
  }
  async perform() {
    if (!this.store.acquireRefresh())
      throw new ProviderError("REFRESH_ALREADY_RUNNING");
    this.store.set("lastAttemptedRefresh", new Date().toISOString());
    try {
      const failures: { id: string; code: string; retryable: boolean }[] = [];
      for (const [i, listing] of this.universe.entries()) {
        if (i) await this.pause();
        const error = await this.refreshListing(listing);
        if (error) failures.push({ id: listing.id, ...error });
      }
      // News is supplementary: its failures are recorded but never fail a price refresh.
      if (this.news)
        for (const listing of this.universe) {
          if (this.store.get(`blockedUntil:${NEWS_HOST}`) > Date.now()) break;
          await this.pause();
          await this.refreshNews(listing);
        }
      if (failures.length) {
        this.store.set("error", {
          code: failures[0].code,
          retryable: failures.every((f) => f.retryable),
          failedListings: failures.map((f) => f.id),
        });
        if (failures.length === this.universe.length)
          throw new ProviderError(failures[0].code);
      } else {
        this.store.set("error", null);
        this.store.set("lastSuccessfulRefresh", new Date().toISOString());
      }
    } finally {
      this.store.releaseRefresh();
    }
  }
}
