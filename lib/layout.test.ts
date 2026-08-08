import { describe, it, expect } from "vitest";
import { LAYOUT, slotForIndex, layoutUnits, unitAspect } from "./layout";

describe("LAYOUT", () => {
  it("has 7 slots (one scatter unit)", () => {
    expect(LAYOUT).toHaveLength(7);
  });

  it("slot 0 is the featured card; the rest alternate left/right", () => {
    expect(LAYOUT.map((s) => s.kind)).toEqual([
      "featured", "left", "right", "left", "right", "left", "right",
    ]);
  });
});

describe("slotForIndex", () => {
  it("maps indexes 0-6 to slots 0-6", () => {
    expect(slotForIndex(4)).toBe(LAYOUT[4]);
  });

  it("wraps every 7 — video 8 (index 7) reuses slot 0 (featured)", () => {
    expect(slotForIndex(7)).toBe(LAYOUT[0]);
    expect(slotForIndex(7).kind).toBe("featured");
  });

  it("puts videos 1, 8 and 15 (indexes 0, 7, 14) on featured slots", () => {
    for (const index of [0, 7, 14]) {
      expect(slotForIndex(index).kind).toBe("featured");
    }
  });
});

describe("layoutUnits", () => {
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ label: `v${i}` }));

  it("returns no units for an empty list", () => {
    expect(layoutUnits([])).toEqual([]);
  });

  it("puts fewer than 7 items in a single partial unit", () => {
    expect(layoutUnits(items(3))).toEqual([items(3)]);
  });

  it("chunks exactly 7 items into one full unit", () => {
    expect(layoutUnits(items(7))).toEqual([items(7)]);
  });

  it("chunks 18 items into 7 + 7 + 4, preserving order", () => {
    const units = layoutUnits(items(18));
    expect(units.map((u) => u.length)).toEqual([7, 7, 4]);
    expect(units[2][0]).toEqual({ label: "v14" });
  });
});

describe("unitAspect", () => {
  const FULL = 1280 / 1984; // full-bleed unit canvas, ≈ 0.645

  it("matches the full unit canvas for a full unit", () => {
    expect(unitAspect(7)).toBeCloseTo(FULL, 5);
  });

  it("trims a 4-card trailing unit to ~74% height", () => {
    // deepest of slots 0-3 is slot 3: bottom 70.13% + 4% pad
    expect(unitAspect(4)).toBeCloseTo(FULL / 0.7413, 3);
  });

  it("trims a 1-card unit to the featured card's band", () => {
    // slot 0 bottom 28.87% + 4% pad
    expect(unitAspect(1)).toBeCloseTo(FULL / 0.3287, 3);
  });

  it("clamps out-of-range counts instead of failing", () => {
    expect(unitAspect(0)).toBeCloseTo(unitAspect(1), 5);
    expect(unitAspect(99)).toBeCloseTo(FULL, 5);
  });
});
