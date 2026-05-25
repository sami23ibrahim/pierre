"use client";

import { useState, useTransition } from "react";
import { slotForIndex } from "@/lib/layout";
import { saveVideosAction } from "@/app/admin/actions";
import type { Video, DraftVideo, PrepareResult } from "@/lib/videos";

type Props = { initialVideos: Video[] };

const toDraft = (v: Video): DraftVideo => ({
  id: v.id,
  link: v.vimeoId,
  client: v.client,
  title: v.title,
});

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

  return (
    <main style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>Portfolio videos</h1>
        <p style={S.sub}>
          {drafts.length} video{drafts.length === 1 ? "" : "s"} — they appear on
          the site in this order, #1 first.
        </p>
      </header>

      <ol style={S.list}>
        {drafts.map((row, index) => {
          const slot = slotForIndex(index);
          const errs = rowErrors[index] ?? [];
          return (
            <li key={row.id} style={S.row}>
              <div style={S.badge}>{index + 1}</div>
              <div style={S.fields}>
                <input
                  style={S.input}
                  placeholder="Vimeo link or ID"
                  value={row.link}
                  onChange={(e) => updateField(index, "link", e.target.value)}
                />
                <input
                  style={S.input}
                  placeholder="Client (e.g. Heineken)"
                  value={row.client}
                  onChange={(e) => updateField(index, "client", e.target.value)}
                />
                <input
                  style={S.input}
                  placeholder="Title (optional)"
                  value={row.title}
                  onChange={(e) => updateField(index, "title", e.target.value)}
                />
                <span style={S.hint}>
                  #{index + 1} → {slot.kind === "featured"
                    ? "featured full-width row"
                    : `paired row, ${slot.kind}`}
                </span>
                {errs.map((msg) => (
                  <span key={msg} style={S.error}>
                    {msg}
                  </span>
                ))}
              </div>
              <div style={S.actions}>
                <button
                  style={S.iconBtn}
                  onClick={() => moveVideo(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  style={S.iconBtn}
                  onClick={() => moveVideo(index, 1)}
                  disabled={index === drafts.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  style={S.deleteBtn}
                  onClick={() => removeVideo(index)}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div style={S.footer}>
        <button style={S.addBtn} onClick={addVideo}>
          + Add video
        </button>
        <div style={S.saveArea}>
          {saved && <span style={S.savedMsg}>Saved — the site is updated.</span>}
          <button style={S.saveBtn} onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, margin: "0 auto", padding: "48px 20px 120px", color: "#eee", fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh" },
  header: { marginBottom: 28 },
  h1: { fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" },
  sub: { fontSize: 13, color: "#888", marginTop: 6 },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", gap: 12, alignItems: "flex-start", background: "#141414", border: "1px solid #262626", borderRadius: 8, padding: 12 },
  badge: { flex: "0 0 28px", height: 28, borderRadius: 14, background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  fields: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  input: { background: "#0c0c0c", border: "1px solid #333", borderRadius: 5, color: "#eee", padding: "8px 10px", fontSize: 13 },
  hint: { fontSize: 11, color: "#666" },
  error: { fontSize: 12, color: "#ff6b6b" },
  actions: { display: "flex", flexDirection: "column", gap: 4 },
  iconBtn: { width: 30, height: 26, background: "#222", border: "1px solid #333", borderRadius: 5, color: "#ccc", cursor: "pointer", fontSize: 13 },
  deleteBtn: { width: 30, height: 26, background: "#2a1414", border: "1px solid #4a1f1f", borderRadius: 5, color: "#ff6b6b", cursor: "pointer", fontSize: 13 },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 16 },
  addBtn: { background: "#1a1a1a", border: "1px dashed #444", borderRadius: 6, color: "#ccc", padding: "10px 16px", fontSize: 13, cursor: "pointer" },
  saveArea: { display: "flex", alignItems: "center", gap: 12 },
  savedMsg: { fontSize: 12, color: "#5ec98a" },
  saveBtn: { background: "#eee", border: "none", borderRadius: 6, color: "#111", padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
};
