export type SlotKind = "featured" | "left" | "right";

export type Slot = {
  kind: SlotKind;
  desktop: {
    media: { left: string; top: string; width: string; height: string };
    label: { left: string; top: string; width: string };
  };
  mobile: { aspectRatio: string };
};

/** A row produced by layoutRows: a featured slot alone, or a left+right pair
 * (which degrades to a lone left when the list ends mid-pair). */
export type LayoutRow<T> =
  | { kind: "featured"; items: [T] }
  | { kind: "paired"; items: [T] | [T, T] };

/**
 * The fixed 12-slot collage blueprint, transcribed verbatim from the original
 * hand-tuned tiles plus the two featured full-width rows (Toyota at slot 0,
 * Du - Too Distressing at slot 5). Video N renders in slot (N-1) mod 12, so
 * the layout repeats every 12 videos. This is design, not content — it stays
 * in code.
 *
 * Note on indexing: the "Video N (1-based) → slot (N-1)" formula is just
 * human-readable shorthand; `slotForIndex` accepts the 0-based array index
 * directly (index 0 → slot 0, index 1 → slot 1, …).
 */
export const LAYOUT: Slot[] = [
  { kind: "featured", desktop: { media: { left: "1.65%",  top: "2.22%",  width: "96.7%",  height: "88%"    }, label: { left: "1.65%",  top: "92%",    width: "96.7%"  } }, mobile: { aspectRatio: "1.778" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "30.97%", width: "62.35%", height: "57.50%" }, label: { left: "1.87%",  top: "89.86%", width: "62.35%" } }, mobile: { aspectRatio: "2.014" } },
  { kind: "right",    desktop: { media: { left: "66.39%", top: "2.22%",  width: "33.50%", height: "89.03%" }, label: { left: "66.39%", top: "92.64%", width: "33.50%" } }, mobile: { aspectRatio: "0.699" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "2.22%",  width: "39.63%", height: "58.89%" }, label: { left: "1.65%",  top: "62.64%", width: "39.63%" } }, mobile: { aspectRatio: "1.250" } },
  { kind: "right",    desktop: { media: { left: "43.14%", top: "7.36%",  width: "56.82%", height: "84.44%" }, label: { left: "43.14%", top: "92.22%", width: "56.82%" } }, mobile: { aspectRatio: "1.250" } },
  { kind: "featured", desktop: { media: { left: "1.65%",  top: "2.22%",  width: "96.7%",  height: "88%"    }, label: { left: "1.65%",  top: "92%",    width: "96.7%"  } }, mobile: { aspectRatio: "1.778" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "2.22%",  width: "33.36%", height: "89.03%" }, label: { left: "1.65%",  top: "92.64%", width: "33.36%" } }, mobile: { aspectRatio: "0.695" } },
  { kind: "right",    desktop: { media: { left: "36.49%", top: "28.06%", width: "63.55%", height: "63.33%" }, label: { left: "36.49%", top: "92.64%", width: "63.55%" } }, mobile: { aspectRatio: "1.865" } },
  { kind: "left",     desktop: { media: { left: "2.17%",  top: "5.69%",  width: "56.82%", height: "63.75%" }, label: { left: "2.17%",  top: "70.83%", width: "56.82%" } }, mobile: { aspectRatio: "1.655" } },
  { kind: "right",    desktop: { media: { left: "61.23%", top: "39.86%", width: "38.66%", height: "47.22%" }, label: { left: "61.23%", top: "88.47%", width: "38.66%" } }, mobile: { aspectRatio: "1.519" } },
  { kind: "left",     desktop: { media: { left: "2.17%",  top: "17.08%", width: "63.55%", height: "63.33%" }, label: { left: "2.17%",  top: "81.81%", width: "63.55%" } }, mobile: { aspectRatio: "1.865" } },
  { kind: "right",    desktop: { media: { left: "67.81%", top: "2.22%",  width: "32.09%", height: "89.03%" }, label: { left: "67.81%", top: "92.64%", width: "32.09%" } }, mobile: { aspectRatio: "0.670" } },
];

/** The slot a video at the given 0-based index renders in. Wraps every 12. */
export function slotForIndex(index: number): Slot {
  const len = LAYOUT.length;
  return LAYOUT[((index % len) + len) % len];
}

/**
 * Walk a list of videos through the layout blueprint and group them into rows.
 * A featured slot becomes its own row; consecutive left+right slots share a
 * paired row. A list that ends on a left slot produces a final paired row
 * with only its left tile (the right half stays empty space).
 *
 * The blueprint is shape, not identity — position in the input array determines
 * which slot each item renders in. Item 0 always hits slot 0 (featured),
 * item 1 hits slot 1 (left), etc., regardless of any identifier on the item.
 */
export function layoutRows<T>(items: T[]): LayoutRow<T>[] {
  const rows: LayoutRow<T>[] = [];
  let i = 0;
  while (i < items.length) {
    const slot = slotForIndex(i);
    if (slot.kind === "featured") {
      rows.push({ kind: "featured", items: [items[i]] });
      i += 1;
    } else {
      const pair: [T] | [T, T] =
        i + 1 < items.length ? [items[i], items[i + 1]] : [items[i]];
      rows.push({ kind: "paired", items: pair });
      i += pair.length;
    }
  }
  return rows;
}
