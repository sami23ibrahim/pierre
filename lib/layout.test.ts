import { describe, it, expect } from "vitest";
import { LAYOUT, slotForIndex, layoutUnits, unitAspect, slotStyles } from "./layout";

const FULL = 1280 / 2146; // full-bleed unit canvas, ≈ 0.596

describe("LAYOUT", () => {
  it("has 7 slots (one scatter unit)", () => {
    expect(LAYOUT).toHaveLength(7);
  });

  it("slot 0 is the featured card; the rest alternate left/right", () => {
    expect(LAYOUT.map((s) => s.kind)).toEqual([
      "featured", "left", "right", "left", "right", "left", "right",
    ]);
  });

  it("gives every caption clear room — no lower card covers an earlier label", () => {
    // A caption occupies from label.top to label.top + ~2.05% (two lines),
    // starting at the card's left edge and reaching at most 35.94% of the
    // unit width (460px at 1280). No later card may start above that block
    // where their x-ranges overlap.
    const LABEL_TEXT = 2.05;
    const LABEL_MAXW = 35.94;
    const n = (v: string) => parseFloat(v);
    for (const a of LAYOUT) {
      const aLeft = n(a.desktop.label.left);
      const aRight = aLeft + Math.min(n(a.desktop.label.width), LABEL_MAXW);
      const aClear = n(a.desktop.label.top) + LABEL_TEXT;
      for (const b of LAYOUT) {
        if (b === a) continue;
        const bTop = n(b.desktop.media.top);
        if (bTop <= n(a.desktop.media.top)) continue; // only cards below a
        const bLeft = n(b.desktop.media.left);
        const bRight = bLeft + n(b.desktop.media.width);
        const xOverlap = aLeft < bRight && bLeft < aRight;
        if (xOverlap) expect(bTop).toBeGreaterThanOrEqual(aClear - 0.01);
      }
    }
  });

  it("keeps every label directly under its own card", () => {
    for (const s of LAYOUT) {
      const mediaBottom = parseFloat(s.desktop.media.top) + parseFloat(s.desktop.media.height);
      expect(parseFloat(s.desktop.label.top)).toBeGreaterThan(mediaBottom);
      expect(s.desktop.label.left).toBe(s.desktop.media.left);
    }
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
  it("matches the full unit canvas for a full unit", () => {
    expect(unitAspect(7)).toBe(FULL);
  });

  it("is wider (shorter) for a trailing partial unit", () => {
    expect(unitAspect(3)).toBeGreaterThan(unitAspect(5));
    expect(unitAspect(5)).toBeGreaterThan(unitAspect(7));
  });

  it("clamps out-of-range counts instead of failing", () => {
    expect(unitAspect(0)).toBe(unitAspect(1));
    expect(unitAspect(99)).toBe(FULL);
  });
});

describe("slotStyles", () => {
  it("returns the raw slot styles inside a full unit", () => {
    expect(slotStyles(0, 7)).toEqual(LAYOUT[0].desktop);
    expect(slotStyles(9, 7)).toEqual(LAYOUT[2].desktop); // index wraps
  });

  it("keeps horizontal geometry untouched in a partial unit", () => {
    const styles = slotStyles(0, 3);
    expect(styles.media.left).toBe(LAYOUT[0].desktop.media.left);
    expect(styles.media.width).toBe(LAYOUT[0].desktop.media.width);
    expect(styles.label.left).toBe(LAYOUT[0].desktop.label.left);
  });

  it("rescales vertical geometry so cards keep their exact rendered shape", () => {
    // In a trimmed unit of count n the row height shrinks by factor f, so
    // top/height percentages must grow by 1/f for identical pixel geometry.
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const f = FULL / unitAspect(count);
      for (let i = 0; i < count; i++) {
        const styles = slotStyles(i, count);
        const slot = slotForIndex(i);
        expect(parseFloat(styles.media.top) * f).toBeCloseTo(parseFloat(slot.desktop.media.top), 1);
        expect(parseFloat(styles.media.height) * f).toBeCloseTo(parseFloat(slot.desktop.media.height), 1);
        expect(parseFloat(styles.label.top) * f).toBeCloseTo(parseFloat(slot.desktop.label.top), 1);
      }
    }
  });

  it("keeps the deepest card of a partial unit fully inside the row", () => {
    for (const count of [1, 2, 3, 4]) {
      for (let i = 0; i < count; i++) {
        const styles = slotStyles(i, count);
        expect(parseFloat(styles.media.top) + parseFloat(styles.media.height)).toBeLessThanOrEqual(100);
      }
    }
  });
});
