import { readFileSync, statSync } from "node:fs";
import { Store } from "./store.ts";
import { Provider } from "./provider.ts";
import { importEvidence } from "./evidence.ts";
import { snapshot } from "./api.ts";
const store = new Store();
try {
  const command = process.argv[2];
  if (command === "import")
    throw new Error(
      "UNSUPPORTED: Yahoo Finance chart API is the selected acquisition path. CSV import is not configured.",
    );
  if (command === "evidence") {
    const path = process.argv[process.argv.indexOf("--file") + 1];
    if (!process.argv.includes("--file") || statSync(path).size > 65536)
      throw new Error("Provide --file with JSON smaller than 64 KiB");
    importEvidence(store, JSON.parse(readFileSync(path, "utf8")));
    console.log("Verified curated evidence imported");
  } else if (command === "refresh" || command === "provider") {
    await new Provider(store).refresh();
    const s = snapshot(store);
    console.log(
      JSON.stringify({
        mode: "real",
        listings: s.data.map((l) => ({
          id: l.id,
          observations: l.history.length,
          to: l.coverage.availableTo,
          news: l.evidence.filter((e) => e.type === "news-report").length,
          error: l.error?.code ?? l.newsError?.code ?? null,
        })),
        coverage: s.meta.coverage,
        error: s.meta.error,
        acquiredAt: s.meta.lastSuccessfulRefresh,
      }),
    );
  } else throw new Error("UNKNOWN_COMMAND");
} catch (e) {
  console.error(e instanceof Error ? e.message : "COMMAND_FAILED");
  process.exitCode = 1;
} finally {
  store.close();
}
