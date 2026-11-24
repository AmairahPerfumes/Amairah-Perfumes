"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import { Trash2, Pencil, Droplets, ImageOff, Plus, Search, UploadCloud, ChevronDown, X } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import {
  createFragranceNote,
  updateFragranceNote,
  deleteFragranceNote,
  saveFragranceNotesBulk,
} from "@/actions/admin/fragranceNotes";
import { normalizeNoteName } from "@/lib/fragranceNotes";
import FilterSelect from "@/components/admin/FilterSelect";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-2.5 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 backdrop-blur-md";
const CHIP_LIMIT = 18;

// "bergamot_01" / "red-berries" -> "Bergamot 01" / "Red Berries"
function guessName(filename) {
  return String(filename || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
    .slice(0, 60);
}

function NoteThumb({ url, className = "h-12 w-12" }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border border-gold-400/15 bg-ink ${className}`}>
      {url ? (
        <Image src={url} alt="" fill sizes="56px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ivory/20">
          <ImageOff className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "" }) {
  return (
    <div className="rounded-2xl border border-gold-400/10 bg-ink-soft/40 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ivory/40">{label}</p>
      <p className={`mt-0.5 font-display text-2xl ${tone || "text-ivory"}`}>{value}</p>
    </div>
  );
}

function EditForm({ note, onCancel, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(note.name);
  const [imageUrl, setImageUrl] = useState(note.image_url);
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await updateFragranceNote(note.id, { name, image_url: imageUrl });
      if (result.success) onSaved(result.note);
      else setError(result.error || "Could not save.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="col-span-full space-y-3 rounded-2xl border border-gold-400/20 bg-white/[0.03] p-4">
      <ImageUploader value={imageUrl} onChange={setImageUrl} folder="amairah/notes" />
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} required />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-gold flex-1 py-2.5 text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-gold-400/10 px-4 py-2.5 text-sm text-ivory/60 transition-colors hover:border-gold-400/25 hover:text-ivory"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Upload many images at once; the file name becomes the ingredient name (editable).
function BulkUploader({ lib, onDone }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const idRef = useRef(0);

  const restoreBodyScroll = () => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
      document.documentElement.style.overflow = "";
    }
  };

  // The widget keeps the first onSuccess closure, so only use functional state updates here.
  const handleSuccess = (result) => {
    restoreBodyScroll();
    const url = result?.info?.secure_url;
    if (!url) return;
    const id = ++idRef.current;
    setRows((prev) => [...prev, { id, url, name: guessName(result.info.original_filename) }]);
  };

  const known = useMemo(() => new Set(lib.map((n) => n.name_key)), [lib]);

  const saveAll = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const result = await saveFragranceNotesBulk(rows.map((r) => ({ name: r.name, image_url: r.url })));
      if (result.success) {
        setMsg({ type: "ok", text: `Saved: ${result.created} new, ${result.updated} updated.${result.problems?.length ? ` Skipped: ${result.problems.join("; ")}` : ""}` });
        setRows([]);
        onDone();
      } else {
        setMsg({ type: "error", text: result.error || result.problems?.join("; ") || "Could not save." });
      }
    } catch {
      setMsg({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${panelClass} space-y-4 p-6`}>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
          <UploadCloud className="h-4 w-4" />
        </div>
        <h2 className="font-display text-base text-ivory">Bulk Upload</h2>
      </div>
      <p className="text-xs leading-relaxed text-ivory/40">
        Select many images at once. The file name becomes the ingredient name — e.g. <code className="text-gold-200">bergamot.png</code> → Bergamot.
        Fix any name below, then save. Existing ingredients just get the new image.
      </p>

      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        options={{
          folder: "amairah/notes",
          multiple: true,
          maxFiles: 30,
          sources: ["local"],
          clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
          maxFileSize: 3000000,
        }}
        onSuccess={handleSuccess}
        onClose={restoreBodyScroll}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold-400/25 py-3 text-sm text-gold-200 transition-colors hover:border-gold-400/50 hover:bg-gold-400/5"
          >
            <UploadCloud className="h-4 w-4" /> Choose images
          </button>
        )}
      </CldUploadWidget>

      {rows.length > 0 && (
        <>
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {rows.map((r) => {
              const exists = known.has(normalizeNoteName(r.name));
              return (
                <li key={r.id} className="flex items-center gap-2.5 rounded-xl border border-gold-400/10 bg-white/[0.02] p-2">
                  <NoteThumb url={r.url} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <input
                      value={r.name}
                      maxLength={60}
                      onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
                      className="w-full rounded-lg border border-gold-400/10 bg-ink/40 px-2.5 py-1.5 text-sm text-ivory focus:border-gold-400/40 focus:outline-none"
                    />
                    {exists && <p className="mt-0.5 text-[11px] text-amber-300/80">Already in library — image will be replaced</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                    className="rounded-lg p-1.5 text-ivory/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={saveAll} disabled={busy} className="btn-gold w-full disabled:opacity-60">
            {busy ? "Saving…" : `Save ${rows.length} image${rows.length === 1 ? "" : "s"}`}
          </button>
        </>
      )}
      {msg && <p className={`text-sm ${msg.type === "ok" ? "text-green-300" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}

export default function FragranceNotesManager({ notes, missing }) {
  const router = useRouter();
  const addFormRef = useRef(null);

  // Local copies so the screen updates instantly after an action; they re-sync
  // whenever the server sends fresh data.
  const [lib, setLib] = useState(notes);
  const [missingList, setMissingList] = useState(missing);
  useEffect(() => setLib(notes), [notes]);
  useEffect(() => setMissingList(missing), [missing]);

  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showAllChips, setShowAllChips] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | noimage | image
  const [sort, setSort] = useState("az"); // az | used

  const withImage = lib.filter((n) => n.image_url).length;
  const noImage = lib.length - withImage;

  const shownLib = useMemo(() => {
    const term = q.trim().toLowerCase();
    return lib
      .filter((n) => (filter === "noimage" ? !n.image_url : filter === "image" ? !!n.image_url : true))
      .filter((n) => (term ? n.name.toLowerCase().includes(term) : true))
      .sort((a, b) => (sort === "used" ? (b.usedIn || 0) - (a.usedIn || 0) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  }, [lib, q, filter, sort]);

  const pickMissing = (m) => {
    setName(m);
    setError("");
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await createFragranceNote({ name, image_url: imageUrl });
      if (result.success) {
        const key = result.note.name_key;
        const used = missingList.find((m) => normalizeNoteName(m.name) === key)?.count || 0;
        setLib((prev) => [...prev, { ...result.note, usedIn: used }].sort((a, b) => a.name.localeCompare(b.name)));
        setMissingList((prev) => prev.filter((m) => normalizeNoteName(m.name) !== key));
        setName("");
        setImageUrl(null);
        router.refresh();
      } else {
        setError(result.error || "Could not save.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`Delete "${note.name}"? Product pages will stop showing its image.`)) return;
    setBusy(true);
    try {
      const result = await deleteFragranceNote(note.id);
      if (result.success) {
        setLib((prev) => prev.filter((n) => n.id !== note.id));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const chips = showAllChips ? missingList : missingList.slice(0, CHIP_LIMIT);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="In library" value={lib.length} />
        <Stat label="With image" value={withImage} tone="text-green-300" />
        <Stat label="Library, no image" value={noImage} tone={noImage ? "text-amber-300" : ""} />
        <Stat label="Used, not added yet" value={missingList.length} tone={missingList.length ? "text-gold-200" : ""} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          {/* Most-used names that still need an image */}
          {missingList.length > 0 && (
            <div className={`${panelClass} p-6`}>
              <h2 className="font-display text-base text-ivory">Add these first</h2>
              <p className="mb-4 mt-1 text-sm text-ivory/40">
                Names used in your products that have no image yet — most-used first. Click one to start adding it.
              </p>
              <div className="flex flex-wrap gap-2">
                {chips.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => pickMissing(m.name)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/20 bg-gold-400/5 py-1.5 pl-3 pr-2 text-sm text-gold-200 transition-colors hover:bg-gold-400/15"
                  >
                    <Plus className="h-3 w-3" />
                    {m.name}
                    <span className="rounded-full bg-gold-400/15 px-1.5 text-[11px] font-semibold text-gold-100">{m.count}</span>
                  </button>
                ))}
              </div>
              {missingList.length > CHIP_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllChips((v) => !v)}
                  className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 hover:underline"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAllChips ? "rotate-180" : ""}`} />
                  {showAllChips ? "Show fewer" : `Show all ${missingList.length}`}
                </button>
              )}
              <p className="mt-3 text-xs text-ivory/30">The number is how many products use that ingredient.</p>
            </div>
          )}

          {/* Library */}
          <div className={`${panelClass} p-6`}>
            <h2 className="mb-4 font-display text-lg text-ivory">Ingredient Library</h2>

            <div className="mb-4 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory/30" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search ingredient…"
                  className="w-full rounded-xl border border-gold-400/10 bg-ink/40 py-2.5 pl-9 pr-3 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold-400/40 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter"
                buttonClassName="rounded-xl border border-gold-400/10 bg-ink/40 px-3.5 py-2.5 text-sm text-ivory hover:border-gold-400/20"
                options={[
                  { value: "all", label: "All" },
                  { value: "noimage", label: "No image" },
                  { value: "image", label: "With image" },
                ]}
              />
              <FilterSelect
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort"
                buttonClassName="rounded-xl border border-gold-400/10 bg-ink/40 px-3.5 py-2.5 text-sm text-ivory hover:border-gold-400/20"
                options={[
                  { value: "az", label: "A → Z" },
                  { value: "used", label: "Most used" },
                ]}
              />
              </div>
            </div>

            {lib.length === 0 ? (
              <p className="py-8 text-center text-sm text-ivory/40">
                No ingredients yet. Add one — e.g. &quot;Bergamot&quot; with a bergamot photo — or use Bulk Upload.
              </p>
            ) : shownLib.length === 0 ? (
              <p className="py-8 text-center text-sm text-ivory/40">No ingredient matches.</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-ivory/40">
                  Showing {shownLib.length} of {lib.length}.
                </p>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {shownLib.map((n) =>
                    editingId === n.id ? (
                      <li key={n.id} className="col-span-full">
                        <EditForm
                          note={n}
                          onCancel={() => setEditingId(null)}
                          onSaved={(saved) => {
                            setLib((prev) => prev.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)));
                            setEditingId(null);
                            router.refresh();
                          }}
                        />
                      </li>
                    ) : (
                      <li key={n.id} className="flex items-center gap-3 rounded-2xl border border-gold-400/10 bg-white/[0.02] p-3">
                        <NoteThumb url={n.image_url} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ivory">{n.name}</p>
                          <p className="text-xs text-ivory/40">
                            {n.usedIn ? `used in ${n.usedIn} product${n.usedIn === 1 ? "" : "s"}` : "not used yet"}
                            {!n.image_url && <span className="ml-1.5 text-amber-300/80">· no image</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingId(n.id)}
                          disabled={busy}
                          aria-label={`Edit ${n.name}`}
                          className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-gold-400/10 hover:text-gold-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(n)}
                          disabled={busy}
                          aria-label={`Delete ${n.name}`}
                          className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  )}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Right column: add one + bulk */}
        <div className="order-1 h-fit min-w-0 space-y-6 lg:order-2">
          <form ref={addFormRef} onSubmit={handleAdd} className={`${panelClass} space-y-4 p-6`}>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
                <Droplets className="h-4 w-4" />
              </div>
              <h2 className="font-display text-base text-ivory">Add Ingredient</h2>
            </div>
            <ImageUploader value={imageUrl} onChange={setImageUrl} folder="amairah/notes" />
            <input
              placeholder="Ingredient name (e.g. Bergamot)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className={inputClass}
              required
            />
            <p className="text-xs text-ivory/40">
              Must match the name used in the product&apos;s notes. Capital letters don&apos;t matter. Square images (400×400) look best.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="btn-gold w-full disabled:opacity-60">
              {busy ? "Saving…" : "Add Ingredient"}
            </button>
          </form>

          <BulkUploader lib={lib} onDone={() => setTimeout(() => window.location.reload(), 1200)} />
        </div>
      </div>
    </div>
  );
}
