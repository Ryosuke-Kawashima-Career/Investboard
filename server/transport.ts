import { request } from "node:https";
import { lookup } from "node:dns";
import { isIP } from "node:net";
import { UNIVERSE } from "./domain.ts";
import { NEWS_HOST } from "./news.ts";
export const CHART_HOST = "query1.finance.yahoo.com";
export function isPublicAddress(address: string) {
  const a = address.toLowerCase();
  if (isIP(a) === 4) {
    const n = a.split(".").map(Number);
    return !(
      n[0] === 0 ||
      n[0] === 10 ||
      n[0] === 127 ||
      n[0] >= 224 ||
      (n[0] === 169 && n[1] === 254) ||
      (n[0] === 172 && n[1] >= 16 && n[1] <= 31) ||
      (n[0] === 192 && n[1] === 168) ||
      (n[0] === 100 && n[1] >= 64 && n[1] <= 127)
    );
  }
  // Only globally routed IPv6 unicast, excluding mapped IPv4 and local ranges.
  return isIP(a) === 6 && /^[23]/.test(a) && !a.startsWith("2001:db8:");
}
export const safeProviderFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  const allowed =
    (url.hostname === CHART_HOST &&
      UNIVERSE.some(
        (l) => url.pathname === `/v8/finance/chart/${l.providerSymbol}`,
      )) ||
    (url.hostname === NEWS_HOST && url.pathname === "/rss/search");
  if (
    url.protocol !== "https:" ||
    !allowed ||
    url.port ||
    url.username ||
    url.password
  )
    throw new Error("UNSAFE_PROVIDER_DESTINATION");
  return new Promise<Response>((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        headers: { "User-Agent": "IndiaForwardLocalResearch/1.0" },
        signal: init?.signal ?? undefined,
        lookup: (hostname, options, callback) => {
          lookup(hostname, { all: true }, (error, addresses) => {
            if (error) return callback(error, "", 4);
            if (
              !addresses.length ||
              addresses.some((a) => !isPublicAddress(a.address))
            )
              return callback(new Error("UNSAFE_DNS_ADDRESS"), "", 4);
            // Validate and connect to the same resolved address; no second DNS lookup.
            if (options.all) (callback as any)(null, addresses);
            else callback(null, addresses[0].address, addresses[0].family);
          });
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2000000) {
            req.destroy(new Error("RESPONSE_TOO_LARGE"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers))
            if (value !== undefined)
              headers.set(key, Array.isArray(value) ? value.join(",") : value);
          resolve(
            new Response(
              [204, 205, 304].includes(res.statusCode || 0)
                ? null
                : Buffer.concat(chunks),
              {
                status: res.statusCode || 502,
                headers,
              },
            ),
          );
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
};
