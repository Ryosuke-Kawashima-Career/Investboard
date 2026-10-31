import { createHash } from "node:crypto";
import { validDate, manifest } from "./domain.ts";
import type { Store } from "./store.ts";
export function validateEvidence(input: any, now = new Date()) {
  const text = (key: string, max = 2000) => {
    if (
      typeof input[key] !== "string" ||
      !input[key].trim() ||
      input[key].length > max
    )
      throw new Error("INVALID_EVIDENCE_" + key.toUpperCase());
    return input[key].trim();
  };
  if (
    input.companyId !== manifest.companyId ||
    input.companyName !== manifest.name ||
    input.publisher !== manifest.name ||
    input.operatorVerified !== true
  )
    throw new Error("UNVERIFIED_COMPANY");
  const url = new URL(text("url"));
  const allowed =
    (url.hostname === "www.ril.com" &&
      /^\/(sites\/default\/files\/|reports\/|ar\d+\/)/.test(url.pathname)) ||
    (url.hostname === "nsearchives.nseindia.com" &&
      /^\/corporate\/ixbrl\/.+\.html$/.test(url.pathname));
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !allowed ||
    url.search
  )
    throw new Error("DISALLOWED_EVIDENCE_URL");
  url.hash = "";
  if (input.publishedAt !== null && !validDate(input.publishedAt))
    throw new Error("INVALID_PUBLICATION_DATE");
  for (const field of ["retrievedAt", "verifiedAt"])
    if (
      !Number.isFinite(Date.parse(text(field))) ||
      Date.parse(input[field]) > now.getTime()
    )
      throw new Error("INVALID_VERIFICATION_TIME");
  if (
    !Array.isArray(input.claimLocations) ||
    input.claimLocations.length < 1 ||
    input.claimLocations.length > 20 ||
    input.claimLocations.some(
      (v: unknown) => typeof v !== "string" || !v.trim() || v.length > 500,
    )
  )
    throw new Error("MISSING_CLAIM_LOCATIONS");
  return {
    id: createHash("sha256").update(url.href).digest("hex").slice(0, 16),
    companyId: manifest.companyId,
    companyName: manifest.name,
    publisher: manifest.name,
    url: url.href,
    title: text("title", 250),
    summary: text("summary", 1500),
    publishedAt: input.publishedAt,
    retrievedAt: input.retrievedAt,
    verifiedAt: input.verifiedAt,
    claimLocations: input.claimLocations,
    limitations: text("limitations"),
    kind: input.kind === "risk" ? "risk" : "opportunity",
    coverage: "curated-single-source",
    acquisition: "curated-import",
    type: "company-disclosure",
  };
}
export function importEvidence(store: Store, input: any) {
  const e = validateEvidence(input);
  store.db
    .prepare("INSERT OR REPLACE INTO evidence VALUES (?,?)")
    .run(e.url, JSON.stringify(e));
  return e;
}
