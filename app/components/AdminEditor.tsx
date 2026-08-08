"use client";

import { useState, useTransition } from "react";
import { layoutUnits, slotForIndex } from "@/lib/layout";
import { saveVideosAction } from "@/app/admin/actions";
import type { Video, DraftVideo, PrepareResult } from "@/lib/videos";

type Props = { initialVideos: Video[] };

const toDraft = (v: Video): DraftVideo => ({
  id: v.id,
  link: v.vimeoId,
  client: v.client,
  title: v.title,
});

type Indexed = { draft: DraftVideo; index: number };

export default function AdminEditor({ initialVideos }: Props) {
  const [drafts, setDrafts] = useState<DraftVideo[]>(initialVideos.map(toDraft));
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const updateField = (index: number, field: keyof DraftVideo, value: string) => {
    setSaved(false);
    setDrafts((d) =>
      d.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const addVideo = () => {
    setSaved(false);
    setDrafts((d) => [
      ...d,
      { id: crypto.randomUUID(), link: "", client: "", title: "" },
    ]);
  };

  const removeVideo = (index: number) => {
    if (!confirm(`Remove video #${index + 1}?`)) return;
    setSaved(false);
    setDrafts((d) => d.filter((_, i) => i !== index));
  };

  const moveVideo = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= drafts.length) return;
    setSaved(false);
    setDrafts((d) => {
      const next = [...d];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = () => {
    startTransition(async () => {
      const result: PrepareResult = await saveVideosAction(drafts);
      if (result.ok) {
        setRowErrors({});
        setSaved(true);
      } else {
        const byRow: Record<number, string[]> = {};
        for (const e of result.errors) {
          (byRow[e.index] ??= []).push(e.message);
        }
        setRowErrors(byRow);
        setSaved(false);
      }
    });
  };

  const units = layoutUnits<Indexed>(
    drafts.map((draft, index) => ({ draft, index })),
  );

  return (
    <main style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>Portfolio videos</h1>
        <p style={S.sub}>
          {drafts.length} video{drafts.length === 1 ? "" : "s"} — laid out the way they appear on the site.
        </p>
        <div style={S.guide}>
          <strong style={S.guideTitle}>Where to find these on Vimeo</strong>
          <ul style={S.guideList}>
            <li>
              <b>URL</b> → address bar (<code style={S.code}>vimeo.com/…</code> or <code style={S.code}>vimeo.com/manage/videos/…</code>)
            </li>
            <li>
              <b>ID</b> → the number at the end of that URL
            </li>
            <li>
              <b>Embed code</b> → Options menu (•••) → Copy embed code
            </li>
          </ul>
        </div>
      </header>

      <div style={S.rows}>
        {units.map((unit, unitIdx) => (
          <div key={unitIdx} style={S.unitRow}>
            {unit.map(({ draft, index }) => {
              const errs = rowErrors[index] ?? [];
              const isLast = index === drafts.length - 1;
              const featured = slotForIndex(index).kind === "featured";
              return (
                <article
                  key={draft.id}
                  style={featured ? { ...S.card, gridColumn: "1 / -1" } : S.card}
                >
                  <div style={S.cardHeader}>
                    <span style={S.badge}>{index + 1}</span>
                    <div style={S.actions}>
                      <button
                        type="button"
                        style={S.iconBtn}
                        onClick={() => moveVideo(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        style={S.iconBtn}
                        onClick={() => moveVideo(index, 1)}
                        disabled={isLast}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        style={S.deleteBtn}
                        onClick={() => removeVideo(index)}
                        aria-label="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <input
                    style={S.input}
                    placeholder="Paste Vimeo URL, embed code, or ID"
                    value={draft.link}
                    onChange={(e) => updateField(index, "link", e.target.value)}
                  />
                  <input
                    style={S.input}
                    placeholder="Client (e.g. Heineken)"
                    value={draft.client}
                    onChange={(e) => updateField(index, "client", e.target.value)}
                  />
                  <input
                    style={S.input}
                    placeholder="Title (optional)"
                    value={draft.title}
                    onChange={(e) => updateField(index, "title", e.target.value)}
                  />
                  {errs.map((msg) => (
                    <span key={msg} style={S.error}>
                      {msg}
                    </span>
                  ))}
                </article>
              );
            })}
          </div>
        ))}
      </div>

      <div style={S.footer}>
        <button type="button" style={S.addBtn} onClick={addVideo}>
          + Add video
        </button>
        <div style={S.saveArea}>
          {saved && <span style={S.savedMsg}>Saved — the site is updated.</span>}
          <button
            type="button"
            style={S.saveBtn}
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 920,
    margin: "0 auto",
    padding: "48px 20px 120px",
    color: "#eee",
    fontFamily: "system-ui, sans-serif",
    background: "#0a0a0a",
    minHeight: "100vh",
  },
  header: { marginBottom: 28 },
  h1: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  sub: { fontSize: 13, color: "#888", marginTop: 6 },
  guide: {
    marginTop: 16,
    padding: "12px 14px",
    background: "#141414",
    border: "1px solid #262626",
    borderRadius: 6,
    fontSize: 12,
    color: "#aaa",
    lineHeight: 1.6,
  },
  guideTitle: {
    display: "block",
    marginBottom: 6,
    color: "#ccc",
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  guideList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  code: {
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    fontSize: 11,
    background: "#0a0a0a",
    padding: "1px 6px",
    borderRadius: 3,
    color: "#ddd",
  },
  rows: { display: "flex", flexDirection: "column", gap: 12 },
  unitRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "#141414",
    border: "1px solid #262626",
    borderRadius: 8,
    padding: 14,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    background: "#2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
  input: {
    background: "#0c0c0c",
    border: "1px solid #333",
    borderRadius: 5,
    color: "#eee",
    padding: "8px 10px",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
  },
  error: { fontSize: 12, color: "#ff6b6b" },
  actions: { display: "flex", gap: 4 },
  iconBtn: {
    width: 30,
    height: 26,
    background: "#222",
    border: "1px solid #333",
    borderRadius: 5,
    color: "#ccc",
    cursor: "pointer",
    fontSize: 13,
  },
  deleteBtn: {
    width: 30,
    height: 26,
    background: "#2a1414",
    border: "1px solid #4a1f1f",
    borderRadius: 5,
    color: "#ff6b6b",
    cursor: "pointer",
    fontSize: 13,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    gap: 16,
  },
  addBtn: {
    background: "#1a1a1a",
    border: "1px dashed #444",
    borderRadius: 6,
    color: "#ccc",
    padding: "10px 16px",
    fontSize: 13,
    cursor: "pointer",
  },
  saveArea: { display: "flex", alignItems: "center", gap: 12 },
  savedMsg: { fontSize: 12, color: "#5ec98a" },
  saveBtn: {
    background: "#eee",
    border: "none",
    borderRadius: 6,
    color: "#111",
    padding: "10px 22px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
};
