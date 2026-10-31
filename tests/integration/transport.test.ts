import { it, expect } from "vitest";
import { isPublicAddress, safeProviderFetch } from "../../server/transport";
it("rejects private IPv4, IPv6, mapped addresses and unconfigured destinations", async () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "172.16.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
  ])
    expect(isPublicAddress(ip)).toBe(false);
  expect(isPublicAddress("8.8.8.8")).toBe(true);
  await expect(safeProviderFetch("https://127.0.0.1/query")).rejects.toThrow(
    "UNSAFE_PROVIDER_DESTINATION",
  );
});
it("allows only universe chart symbols and the news search path", async () => {
  for (const url of [
    "https://query1.finance.yahoo.com/v8/finance/chart/EVIL.NS",
    "https://query1.finance.yahoo.com/v1/finance/search?q=x",
    "https://news.google.com/rss/articles/abc",
    "http://news.google.com/rss/search?q=x",
    "https://news.google.com.evil.test/rss/search",
  ])
    await expect(safeProviderFetch(url)).rejects.toThrow(
      "UNSAFE_PROVIDER_DESTINATION",
    );
});
