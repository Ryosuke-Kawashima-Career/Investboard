import { useState } from "react";
import { listings } from "./data";
export const STORAGE_KEY = "arbor.watchlist.v1";
export function useWatchlist() {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ids: [] as string[], warning: "" };
      const value = JSON.parse(raw);
      if (
        value.version !== 1 ||
        !Array.isArray(value.listingIds) ||
        !value.listingIds.every((id: unknown) => typeof id === "string")
      )
        throw new Error("invalid");
      return {
        ids: [...new Set<string>(value.listingIds)].filter((id) =>
          listings.some((l) => l.id === id),
        ),
        warning: "",
      };
    } catch {
      return {
        ids: [] as string[],
        warning:
          "Saved watchlist could not be read. Research still works; changes will be kept for this session.",
      };
    }
  });
  const [ids, setIds] = useState(initial.ids);
  const [warning, setWarning] = useState(initial.warning);
  function update(next: string[]) {
    setIds(next);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, listingIds: next }),
      );
      setWarning("");
    } catch {
      setWarning(
        "Browser storage is unavailable. Your watchlist is kept only for this session.",
      );
    }
  }
  return {
    ids,
    warning,
    toggle: (id: string) =>
      update(
        ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
      ),
    clear: () => update([]),
  };
}
