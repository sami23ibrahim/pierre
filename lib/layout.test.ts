import { describe, it, expect } from "vitest";
import { LAYOUT, slotForIndex, layoutRows } from "./layout";

describe("LAYOUT", () => {
  it("has 12 slots", () => {
    expect(LAYOUT).toHaveLength(12);
  });

  it("marks slots 0 and 5 as featured (full-width)", () => {
    expect(LAYOUT[0].kind).toBe("featured");
    expect(LAYOUT[5].kind).toBe("featured");
  });

  it("every left slot is followed by a right slot (so they always pair)", () => {
    LAYOUT.forEach((slot, i) => {
      if (slot.kind === "left") {
        expect(LAYOUT[i + 1]?.kind).toBe("right");
      }
    });
  });
});

describe("slotForIndex", () => {
  it("maps indexes 0-11 to slots 0-11", () => {
    expect(slotForIndex(7)).toBe(LAYOUT[7]);
  });

  it("wraps every 12 — video 13 (index 12) reuses slot 0 (a featured row)", () => {
    expect(slotForIndex(12)).toBe(LAYOUT[0]);
    expect(slotForIndex(12).kind).toBe("featured");
  });

  it("wraps — video 15 (index 14) reuses slot 2", () => {
    expect(slotForIndex(14)).toBe(LAYOUT[2]);
  });
});

describe("layoutRows", () => {
  // Pass plain items; their index in the input array determines their slot.
  // Use a label so we can assert which items end up where, but DO NOT use
  // that label as the slot index — the function uses positional index.
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ label: `v${i}` }));

  it("puts a featured slot in its own row (slot 0 is featured)", () => {
    expect(layoutRows(items(1))).toEqual([
      { kind: "featured", items: [{ label: "v0" }] },
    ]);
  });

  it("a 3-item list becomes featured(0) + paired(1, 2)", () => {
    expect(layoutRows(items(3))).toEqual([
      { kind: "featured", items: [{ label: "v0" }] },
      { kind: "paired", items: [{ label: "v1" }, { label: "v2" }] },
    ]);
  });

  it("mixes featured and paired rows in the right order for the 12-slot seed list", () => {
    const result = layoutRows(items(12));
    expect(result.map((r) => r.kind)).toEqual([
      "featured", "paired", "paired", "featured", "paired", "paired", "paired",
    ]);
  });

  it("leaves a lone item in the final paired row when the list ends on a left slot", () => {
    // Slot 6 is left. A 7-item list ends at index 6 (left slot) with no right partner.
    // Expected rows: featured(0), paired(1,2), paired(3,4), featured(5), paired(6) lone-left.
    const result = layoutRows(items(7));
    expect(result.map((r) => r.kind)).toEqual([
      "featured", "paired", "paired", "featured", "paired",
    ]);
    expect(result[4].items).toHaveLength(1);
    expect(result[4].items[0]).toEqual({ label: "v6" });
  });

  it("returns no rows for an empty list", () => {
    expect(layoutRows([])).toEqual([]);
  });
});
