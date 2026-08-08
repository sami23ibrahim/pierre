export type SlotKind = "featured" | "left" | "right";

export type Slot = {
  kind: SlotKind;
  desktop: {
    media: { left: string; top: string; width: string; height: string };
    label: { left: string; top: string; width: string };
  };
  mobile: { aspectRatio: string };
};

/**
 * The 7-slot scatter unit. Card shapes, relative sizes and stagger are
 * measured programmatically from docs/reference/newlayout.jpeg; the whole
 * composition is then scaled uniformly (x1.2402) to full bleed — the image
 * shows the card shapes, not page margins — so the deepest cards sit on the
 * site's usual 1.65% side margins and the featured card stays centered.
 * Unit canvas: 1280x1984 (aspect ~0.645). Video N renders in slot
 * (N-1) mod 7, so the unit repeats every 7 videos — featured cards land on
 * videos 1, 8, 15, …
 *
 * All percentages are relative to the unit canvas. Slots 2 and 3 interleave
 * vertically across the left/right columns (slot 3 starts above slot 2's
 * bottom edge), which is why a unit renders as one positioning canvas
 * rather than stacked rows. Labels sit 0.75% below their card, aligned to
 * its left edge. This is design, not content — it stays in code.
 */
export const LAYOUT: Slot[] = [
  { kind: "featured", desktop: { media: { left: "13.57%", top: "5.50%",  width: "72.86%", height: "23.37%" }, label: { left: "13.57%", top: "29.62%", width: "72.86%" } }, mobile: { aspectRatio: "2.011" } },
  { kind: "left",     desktop: { media: { left: "5.72%",  top: "30.50%", width: "33.33%", height: "16.13%" }, label: { left: "5.72%",  top: "47.38%", width: "33.33%" } }, mobile: { aspectRatio: "1.333" } },
  { kind: "right",    desktop: { media: { left: "45.06%", top: "29.62%", width: "45.93%", height: "23.75%" }, label: { left: "45.06%", top: "54.12%", width: "45.93%" } }, mobile: { aspectRatio: "1.247" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "50.00%", width: "41.27%", height: "20.13%" }, label: { left: "1.65%",  top: "70.88%", width: "41.27%" } }, mobile: { aspectRatio: "1.323" } },
  { kind: "right",    desktop: { media: { left: "45.06%", top: "54.38%", width: "53.29%", height: "19.12%" }, label: { left: "45.06%", top: "74.25%", width: "53.29%" } }, mobile: { aspectRatio: "1.797" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "75.25%", width: "58.13%", height: "22.75%" }, label: { left: "1.65%",  top: "98.75%", width: "58.13%" } }, mobile: { aspectRatio: "1.648" } },
  { kind: "right",    desktop: { media: { left: "62.30%", top: "78.25%", width: "33.33%", height: "16.13%" }, label: { left: "62.30%", top: "95.13%", width: "33.33%" } }, mobile: { aspectRatio: "1.333" } },
];

/** The slot a video at the given 0-based index renders in. Wraps every 7. */
export function slotForIndex(index: number): Slot {
  const len = LAYOUT.length;
  return LAYOUT[((index % len) + len) % len];
}

/** Chunk videos into scatter units of up to 7; the last unit may be partial. */
export function layoutUnits<T>(items: T[]): T[][] {
  const units: T[][] = [];
  for (let i = 0; i < items.length; i += LAYOUT.length) {
    units.push(items.slice(i, i + LAYOUT.length));
  }
  return units;
}

/** Full-unit canvas aspect (width / height): the reference composition scaled
 * to full bleed — 1280 / 1984. */
const UNIT_ASPECT = 1280 / 1984;
/** Breathing room below the deepest card of a partial unit (unit-height fraction). */
const BOTTOM_PAD = 0.04;

/**
 * Rendered aspect ratio for a unit holding `count` cards. A full unit uses
 * the whole canvas; a partial trailing unit shrinks so the page doesn't end
 * on dead whitespace: height stops at the deepest present card plus label
 * padding.
 */
export function unitAspect(count: number): number {
  const n = Math.max(1, Math.min(count, LAYOUT.length));
  let maxBottom = 0;
  for (const slot of LAYOUT.slice(0, n)) {
    const bottom =
      (parseFloat(slot.desktop.media.top) + parseFloat(slot.desktop.media.height)) / 100;
    if (bottom > maxBottom) maxBottom = bottom;
  }
  return UNIT_ASPECT / Math.min(1, maxBottom + BOTTOM_PAD);
}
