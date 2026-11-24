"use client";

import { useEffect, useState } from "react";
import { Trash2, Megaphone, Pencil, Plus, Check, X } from "lucide-react";
import Switch from "@/components/admin/Switch";
import { createAnnouncement, updateAnnouncement, toggleAnnouncement, deleteAnnouncement } from "@/actions/admin/announcements";

const MAX = 200;
const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-3 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 backdrop-blur-md";

function Stat({ label, value, tone = "" }) {
  return (
    <div className="rounded-2xl border border-gold-400/10 bg-ink-soft/40 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ivory/45">{label}</p>
      <p className={`mt-0.5 font-display text-2xl ${tone || "text-ivory"}`}>{value}</p>
    </div>
  );
}

// What the bar at the top of the store looks like.
function BarPreview({ messages }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gold-400/15 bg-[#0b0a0a]">
      <div className="flex items-center justify-center gap-3 border-b border-gold-400/20 px-4 py-2.5 text-center">
        <Megaphone className="h-3.5 w-3.5 shrink-0 text-gold-300" />
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-200 sm:text-xs">
          {messages[0] || "Your announcement shows here"}
        </span>
        <Megaphone className="h-3.5 w-3.5 shrink-0 text-gold-300" />
      </div>
    </div>
  );
}

function EditRow({ announcement, onCancel, onSaved }) {
  const [text, setText] = useState(announcement.message);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await updateAnnouncement(announcement.id, text);
      if (result?.success) onSaved(result.announcement);
      else setError(result?.error || "Could not save.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="w-full space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={2}
        autoFocus
        className={`${inputClass} resize-none`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ivory/50">{text.length}/{MAX}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-gold-400/10 px-4 py-2 text-sm text-ivory/60 transition-colors hover:border-gold-400/25 hover:text-ivory">
            Cancel
          </button>
          <button type="submit" disabled={busy || !text.trim()} className="btn-gold px-5 py-2 text-sm disabled:opacity-60">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm font-medium text-red-300">{error}</p>}
    </form>
  );
}

export default function AnnouncementForm({ announcements }) {
  const [items, setItems] = useState(announcements);
  useEffect(() => setItems(announcements), [announcements]);

  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const activeCount = items.filter((a) => a.is_active).length;
  const liveMessages = items.filter((a) => a.is_active).map((a) => a.message);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      const result = await createAnnouncement(message);
      if (result?.success) {
        setItems((prev) => [result.announcement, ...prev]);
        setMessage("");
      } else {
        setError(result?.error || "Could not add the announcement.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (a) => {
    setBusyId(a.id);
    setListError("");
    try {
      const result = await toggleAnnouncement(a.id, !a.is_active);
      if (result?.success) setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: !a.is_active } : x)));
      else setListError(result?.error || "Could not update.");
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm("Delete this announcement?")) return;
    setBusyId(a.id);
    setListError("");
    try {
      const result = await deleteAnnouncement(a.id);
      if (result?.success) setItems((prev) => prev.filter((x) => x.id !== a.id));
      else setListError(result?.error || "Could not delete.");
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total" value={items.length} />
        <Stat label="Live on store" value={activeCount} tone="text-green-300" />
        <Stat label="Switched off" value={items.length - activeCount} tone={items.length - activeCount ? "text-amber-300" : ""} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ------------------------------------------------ list */}
        <div className={`${panelClass} order-2 min-w-0 p-6 md:p-8 xl:order-1`}>
          <h2 className="font-display text-lg text-ivory">Your announcements</h2>
          <p className="mb-5 mt-0.5 text-sm font-semibold text-ivory/65">Every switched-on message is shown in the bar at the top of the store.</p>

          {listError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300">{listError}</p>}

          {items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gold-400/15 px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
                <Megaphone className="h-5 w-5" />
              </div>
              <p className="text-base text-ivory/70">No announcements yet</p>
              <p className="mt-1 max-w-xs text-sm font-medium text-ivory/45">Add one — for example &quot;Free shipping above ₹1499&quot;.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((a) => (
                <li
                  key={a.id}
                  className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${a.is_active ? "border-gold-400/10 bg-white/[0.02]" : "border-ivory/5 bg-white/[0.01] opacity-70"}`}
                >
                  {editingId === a.id ? (
                    <EditRow
                      announcement={a}
                      onCancel={() => setEditingId(null)}
                      onSaved={(saved) => {
                        setItems((prev) => prev.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)));
                        setEditingId(null);
                      }}
                    />
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.is_active ? "bg-gold-400/10 text-gold-300" : "bg-ivory/10 text-ivory/40"}`}>
                          <Megaphone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="break-words text-[15px] font-medium text-ivory">{a.message}</p>
                          <p className="mt-0.5 text-[13px] font-medium text-ivory/40">
                            {a.is_active ? "Live" : "Switched off"} · added {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gold-400/10 pt-3 sm:justify-end sm:border-0 sm:pt-0">
                        <Switch size="sm" checked={a.is_active} disabled={busyId === a.id} onChange={() => handleToggle(a)} label={a.is_active ? "Switch off" : "Switch on"} />
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingId(a.id)} disabled={busyId === a.id} aria-label="Edit announcement" className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-gold-400/10 hover:text-gold-300">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(a)} disabled={busyId === a.id} aria-label="Delete announcement" className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ------------------------------------------------ add + preview */}
        <div className="order-1 h-fit min-w-0 space-y-6 xl:order-2">
          <form onSubmit={handleAdd} className={`${panelClass} space-y-4 p-6`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg text-ivory">New announcement</h2>
                <p className="mt-0.5 text-sm font-semibold text-ivory/65">Goes live right away</p>
              </div>
            </div>
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX}
                rows={3}
                placeholder="e.g. Free shipping above ₹1499"
                className={`${inputClass} resize-none`}
              />
              <div className="mt-1.5 flex items-center justify-between text-[13px] font-medium text-ivory/50">
                <span>Keep it short — it sits in a single line.</span>
                <span className={message.length > MAX - 20 ? "text-amber-300" : ""}>{message.length}/{MAX}</span>
              </div>
            </div>
            {error && <p className="text-sm font-medium text-red-300">{error}</p>}
            <button type="submit" disabled={adding || !message.trim()} className="btn-gold w-full disabled:opacity-60">
              {adding ? "Adding…" : "Add Announcement"}
            </button>
          </form>

          <div className={`${panelClass} space-y-3 p-6`}>
            <h2 className="font-display text-base text-ivory">How it looks on the store</h2>
            <BarPreview messages={message.trim() ? [message.trim()] : liveMessages} />
            <p className="text-[13px] font-medium text-ivory/50">
              {message.trim() ? "Preview of what you are typing." : liveMessages.length ? "The bar currently shows your live announcements." : "Nothing is live — the bar is hidden."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
