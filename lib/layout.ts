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
 * Because the reference has no captions, each band below the featured card
 * is additionally pushed down just far enough (45/85/110px on the reference
 * scale) that every caption has guaranteed room before the next card starts;
 * card shapes are untouched by this. Unit canvas: 1280x2146 (aspect ~0.596).
 *
 * Video N renders in slot (N-1) mod 7, so the unit repeats every 7 videos —
 * featured cards land on videos 1, 8, 15, … All percentages are relative to
 * the unit canvas. Slots 2 and 3 interleave vertically across the left/right
 * columns (slot 3 starts above slot 2's bottom edge), which is why a unit
 * renders as one positioning canvas rather than stacked rows. This is
 * design, not content — it stays in code.
 */
export const LAYOUT: Slot[] = [
  { kind: "featured", desktop: { media: { left: "13.57%", top: "5.09%",  width: "72.86%", height: "21.61%" }, label: { left: "13.57%", top: "27.45%", width: "72.86%" } }, mobile: { aspectRatio: "2.011" } },
  { kind: "left",     desktop: { media: { left: "5.72%",  top: "30.31%", width: "33.33%", height: "14.91%" }, label: { left: "5.72%",  top: "45.96%", width: "33.33%" } }, mobile: { aspectRatio: "1.333" } },
  { kind: "right",    desktop: { media: { left: "45.06%", top: "29.50%", width: "45.93%", height: "21.96%" }, label: { left: "45.06%", top: "52.20%", width: "45.93%" } }, mobile: { aspectRatio: "1.247" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "50.21%", width: "41.28%", height: "18.61%" }, label: { left: "1.65%",  top: "69.56%", width: "41.28%" } }, mobile: { aspectRatio: "1.323" } },
  { kind: "right",    desktop: { media: { left: "45.06%", top: "54.25%", width: "53.29%", height: "17.68%" }, label: { left: "45.06%", top: "72.68%", width: "53.29%" } }, mobile: { aspectRatio: "1.797" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "74.73%", width: "58.14%", height: "21.04%" }, label: { left: "1.65%",  top: "96.52%", width: "58.14%" } }, mobile: { aspectRatio: "1.648" } },
  { kind: "right",    desktop: { media: { left: "62.31%", top: "77.51%", width: "33.33%", height: "14.91%" }, label: { left: "62.31%", top: "93.16%", width: "33.33%" } }, mobile: { aspectRatio: "1.333" } },
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
 * to full bleed, plus caption clearance — 1280 / 2146. */
const UNIT_ASPECT = 1280 / 2146;
/** Height of a two-line caption as a fraction of the unit height. */
const LABEL_TEXT_FRAC = 0.0205;
/** Breathing room below the deepest caption of a partial unit. */
const BOTTOM_PAD = 0.014;

/**
 * The fraction of the full unit height that a unit holding `count` cards
 * actually needs: down to the deepest present caption plus padding. 1 for a
 * full unit.
 */
function unitFraction(count: number): number {
  const n = Math.max(1, Math.min(count, LAYOUT.length));
  if (n === LAYOUT.length) return 1;
  let maxClear = 0;
  for (const slot of LAYOUT.slice(0, n)) {
    const clear = parseFloat(slot.desktop.label.top) / 100 + LABEL_TEXT_FRAC;
    if (clear > maxClear) maxClear = clear;
  }
  return Math.min(1, maxClear + BOTTOM_PAD);
}

/**
 * Rendered aspect ratio for a unit holding `count` cards. A full unit uses
 * the whole canvas; a partial trailing unit shrinks so the page doesn't end
 * on dead whitespace.
 */
export function unitAspect(count: number): number {
  return UNIT_ASPECT / unitFraction(count);
}

/**
 * Positioning styles for the video at `index` inside a unit holding `count`
 * cards. In a full unit these are the raw slot percentages; in a trimmed
 * trailing unit the vertical values are rescaled by the trim factor so every
 * card keeps exactly the same rendered shape and pixel position as in a full
 * unit — the row just ends sooner.
 */
export function slotStyles(index: number, count: number): Slot["desktop"] {
  const slot = slotForIndex(index);
  const f = unitFraction(count);
  if (f >= 1) return slot.desktop;
  const scaleY = (v: string) => `${(parseFloat(v) / f).toFixed(2)}%`;
  const { media, label } = slot.desktop;
  return {
    media: { ...media, top: scaleY(media.top), height: scaleY(media.height) },
    label: { ...label, top: scaleY(label.top) },
  };
}
