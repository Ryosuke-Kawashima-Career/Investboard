import { it, expect } from "vitest";
import { discovery, momentum, newsCoverage } from "../../server/domain";
const item = (publishedAt: string | null, id = String(publishedAt)) => ({
  id,
  companyId: "reliance",
  verifiedAt: "2026-10-31",
  type: "company-disclosure",
  publishedAt,
});
it("uses publication dates and inclusive 30-day India window", () => {
  const s = discovery(
    [
      item("2026-10-02"),
      item("2026-10-01"),
      item("2026-10-31"),
      item("2026-11-01"),
      item(null),
    ],
    new Date("2026-10-30T18:30:00Z"),
  );
  expect(s.evidenceIds).toEqual(["2026-10-02", "2026-10-31"]);
  expect(s.exclusions).toHaveLength(3);
});
it("returns empty for old, missing, future and wrong-company evidence without inventing fundamentals", () => {
  expect(
    discovery(
      [
        item(null),
        item("2026-09-30"),
        { ...item("2026-10-31"), companyId: "other" },
      ],
      new Date("2026-10-31"),
    ).value,
  ).toBeNull();
  expect(discovery([], new Date("2026-10-31")).evidenceIds).toEqual([]);
});
it("computes 1-month momentum from the same close series and never qualifies on missing history", () => {
  const point = (date: string, close: number) => ({ date, close });
  const s = momentum([
    point("2026-09-29", 100),
    point("2026-09-30", 100),
    point("2026-10-15", 103),
    point("2026-10-30", 106),
  ]);
  expect(s).toMatchObject({ value: 6, qualifies: true });
  expect(s.period).toBe("2026-09-30 close to 2026-10-30 close");
  expect(momentum([point("2026-10-30", 106)])).toMatchObject({
    value: null,
    qualifies: false,
  });
  expect(momentum([])).toMatchObject({ value: null, qualifies: false });
});
it("counts only company-matched dated headlines in the 7-day India window", () => {
  const news = (publishedAt: string | null, companyId = "reliance") => ({
    id: String(publishedAt) + companyId,
    companyId,
    type: "news-report",
    publishedAt,
  });
  const s = newsCoverage(
    [
      news("2026-10-25"),
      news("2026-10-31"),
      news("2026-10-24"),
      news(null),
      news("2026-10-30", "tcs"),
    ],
    new Date("2026-10-31T06:00:00Z"),
  );
  expect(s).toMatchObject({ value: 2, qualifies: false });
});
