import { it, expect } from "vitest";
import { Store } from "../../server/store";
import { Provider } from "../../server/provider";
import { route, snapshot } from "../../server/api";
import { manifest, UNIVERSE } from "../../server/domain";
import { daily, fakeTransport, rssItem } from "./helpers";
it("verifies identity, serves local search, same-series quote, calendar history and bounded routes", async () => {
  const s = new Store(":memory:");
  let calls = 0;
  const p = new Provider(
    s,
    async () => {
      calls++;
      return Response.json(daily());
    },
    { universe: [manifest], news: false, pauseMs: 0 },
  );
  await p.refresh();
  expect(calls).toBe(1);
  const read = (path: string) =>
    route(s, new URL("http://local" + path), new Date("2026-10-31"));
  expect(read("/api/companies?q=reliance").body.data).toHaveLength(1);
  expect(read("/api/companies?q=tcs").body.data).toHaveLength(0);
  expect(read("/api/listings/NSE/RELIANCE/quote").body.data).toMatchObject({
    price: 102.9,
    previousClose: 102.8,
    sourceTimestamp: null,
  });
  expect(
    read("/api/listings/NSE/RELIANCE/history?period=6M").body.meta.coverage
      .completeness,
  ).toBe("partial");
  expect(read("/api/listings/BSE/RELIANCE/quote").status).toBe(404);
  expect(read("/api/listings/NSE/TCS/quote").status).toBe(404);
  expect(read("/api/listings/NSE/RELIANCE/history?period=2Y").status).toBe(400);
  expect(read("/api/companies?limit=0").status).toBe(400);
  expect(read("/api/companies?cursor=-1").status).toBe(400);
  expect(read("/api/discovery?signal=made-up").status).toBe(400);
  expect(calls).toBe(1);
  expect(JSON.stringify(snapshot(s))).not.toContain("test-key");
  s.close();
});
it("refreshes the whole universe with news, then serves search, sectors and discovery", async () => {
  const s = new Store(":memory:");
  const now = new Date();
  const day = (offset: number) =>
    new Date(now.getTime() - offset * 86400000).toUTCString();
  const { transport, calls } = fakeTransport([
    rssItem("Infosys wins large deal", "Paper A", day(1)),
    rssItem("Infosys wins large deal", "Paper B", day(1)),
    rssItem("Infosys opens campus", "Paper C", day(2)),
    rssItem("Infosys guidance cut", "Paper D", day(3)),
    rssItem("Unrelated market wrap", "Paper E", day(1)),
  ]);
  await new Provider(s, transport, { pauseMs: 0 }).refresh();
  expect(calls).toHaveLength(UNIVERSE.length * 2);
  const read = (path: string) => route(s, new URL("http://local" + path));
  const all = read("/api/companies").body;
  expect(all.data).toHaveLength(UNIVERSE.length);
  expect(all.meta.coverage.listings).toBe(UNIVERSE.length);
  expect(read("/api/companies?sector=Banking").body.data).toHaveLength(
    UNIVERSE.filter((l) => l.sector === "Banking").length,
  );
  expect(read("/api/companies?q=airtel").body.data[0].symbol).toBe(
    "BHARTIARTL",
  );
  const infosys = read("/api/companies/infosys").body.data;
  const news = infosys.evidence.filter((e: any) => e.type === "news-report");
  expect(news).toHaveLength(3);
  expect(news.find((e: any) => e.syndicatedCopies === 1)).toBeTruthy();
  expect(
    infosys.signals.find((x: any) => x.version === "news-coverage-7d-v1"),
  ).toMatchObject({ value: 3, qualifies: true });
  const discovered = read("/api/discovery?signal=news-coverage-7d-v1").body;
  expect(discovered.data.map((d: any) => d.listingId)).toEqual(["NSE:INFY"]);
  expect(read("/api/companies/unknown").status).toBe(404);
  s.close();
});
it("keeps other listings when one listing's identity check fails", async () => {
  const s = new Store(":memory:");
  const { transport } = fakeTransport();
  const broken = (async (input: URL | string, init?: RequestInit) => {
    if (String(input).includes("/TCS.NS")) return Response.json(daily());
    return transport(input, init);
  }) as typeof fetch;
  await new Provider(s, broken, { pauseMs: 0, news: false }).refresh();
  const snap = snapshot(s);
  expect(snap.data).toHaveLength(UNIVERSE.length - 1);
  expect(snap.meta.error).toMatchObject({
    code: "PROVIDER_IDENTITY_MISMATCH",
    failedListings: ["NSE:TCS"],
  });
  s.close();
});
