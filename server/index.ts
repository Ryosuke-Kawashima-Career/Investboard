import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { Store } from "./store.ts";
import { Provider } from "./provider.ts";
import { route } from "./api.ts";
import { indiaDate } from "./domain.ts";
export function makeServer(store: Store) {
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    const send = (
      status: number,
      data: Buffer,
      headers: Record<string, string>,
    ) => {
      const compress =
        /\bgzip\b/.test(req.headers["accept-encoding"] || "") &&
        data.length > 512;
      res.writeHead(status, {
        ...headers,
        Vary: "Accept-Encoding",
        ...(compress ? { "Content-Encoding": "gzip" } : {}),
      });
      res.end(compress ? gzipSync(data) : data);
    };
    try {
      const url = new URL(req.url || "/", "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        const result = route(store, url);
        send(result.status || 200, Buffer.from(JSON.stringify(result.body)), {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        return;
      }
      const root = resolve("dist");
      const target = resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
      if (!target.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const types: Record<string, string> = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
      const data = await readFile(target);
      send(200, data, {
        "Content-Type": types[extname(target)] || "application/octet-stream",
      });
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: { code: "NOT_FOUND", retryable: false } }),
      );
    }
  });
}
export function run() {
  const store = new Store(),
    provider = new Provider(store);
  const server = makeServer(store);
  server.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
    console.log("Research API ready on loopback"),
  );
  const refresh = () =>
    provider
      .refresh()
      .catch(() =>
        console.log("Refresh unavailable; inspect /api/health metadata"),
      );
  if (!store.history().length && process.env.DISABLE_REFRESH !== "1")
    void refresh();
  const timer = setInterval(() => {
    if (process.env.DISABLE_REFRESH === "1") return;
    const now = new Date(),
      local = new Date(now.getTime() + 19800000),
      day = indiaDate(now);
    if (
      local.getUTCDay() !== 0 &&
      local.getUTCDay() !== 6 &&
      local.getUTCHours() >= 19 &&
      store.get("scheduledDay") !== day
    ) {
      store.set("scheduledDay", day);
      void refresh();
    }
  }, 30000);
  const stop = () => {
    clearInterval(timer);
    server.close(() => {
      store.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  run();
