"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trash2, ImagePlus, Check, AlertCircle, Sparkles, Pencil, Link2 } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import Switch from "@/components/admin/Switch";
import { createHeroSlide, updateHeroSlide, toggleHeroSlide, deleteHeroSlide } from "@/actions/admin/hero";
import { updateSiteSetting } from "@/actions/settings";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-3 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";
const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 backdrop-blur-md";

const HERO_ENABLED_KEY = "home_hero_enabled";
const HERO_SETTINGS_FIELDS = [
  { key: "home_hero_badge_text", label: "Badge text", hint: 'The small pill above the title, e.g. "Amairah Perfumes".' },
  { key: "home_hero_rating_value", label: "Star rating", hint: "A number from 0 to 5, e.g. 4.9." },
  { key: "home_hero_reviews_text", label: "Reviews text", hint: 'Shown next to the stars, e.g. "500+ Reviews".' },
  { key: "home_hero_shipped_text", label: "Shipped stat", hint: 'e.g. "10k+ Bottles Shipped Pan-India".' },
];

// ---------------------------------------------------------------- hero settings (badge, rating, stats)
function HeroSettingsPanel({ settings, onSaved }) {
  const keys = [HERO_ENABLED_KEY, ...HERO_SETTINGS_FIELDS.map((f) => f.key)];
  const initial = Object.fromEntries(keys.map((k) => [k, k === HERO_ENABLED_KEY ? settings[k]?.value ?? "true" : settings[k]?.value ?? ""]));
  const [values, setValues] = useState(initial);
  const [base, setBase] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);

  const enabled = values[HERO_ENABLED_KEY] !== "false";
  const dirty = keys.filter((k) => values[k] !== base[k]);
  const change = (key, value) => {
    setSaved(null);
    setValues((p) => ({ ...p, [key]: value }));
  };

  const save = async () => {
    setSaved(null);
    setBusy(true);
    try {
      const results = await Promise.all(dirty.map((k) => updateSiteSetting(k, values[k])));
      const failed = results.find((r) => !r.success);
      if (failed) setSaved({ success: false, error: failed.error || "Could not save." });
      else {
        setBase((p) => ({ ...p, ...Object.fromEntries(dirty.map((k) => [k, values[k]])) }));
        setSaved({ success: true });
        onSaved?.(Object.fromEntries(dirty.map((k) => [k, values[k]])));
      }
    } catch {
      setSaved({ success: false, error: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${panelClass} p-6 md:p-8`}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg text-ivory">Hero section</h2>
            <p className="mt-0.5 text-sm font-semibold text-ivory/65">The badge, rating and stats shown over the banner — the same on every slide.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-gold-400/10 bg-white/[0.02] py-1.5 pl-4 pr-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${enabled ? "text-green-300" : "text-ivory/45"}`}>{enabled ? "Shown on homepage" : "Hidden"}</span>
          <Switch size="sm" checked={enabled} onChange={() => change(HERO_ENABLED_KEY, enabled ? "false" : "true")} label="Show hero on homepage" />
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${enabled ? "" : "opacity-60"}`}>
        {HERO_SETTINGS_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className={labelClass}>{f.label}</label>
            <input id={f.key} value={values[f.key]} onChange={(e) => change(f.key, e.target.value)} className={inputClass} />
            <p className="mt-1.5 text-[13px] font-medium text-ivory/50">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-gold-400/10 pt-5">
        <div className="min-w-0 text-sm font-medium">
          {saved && !saved.success ? (
            <span className="flex items-center gap-2 text-red-300"><AlertCircle className="h-4 w-4 shrink-0" /> {saved.error}</span>
          ) : saved?.success && dirty.length === 0 ? (
            <span className="flex items-center gap-2 text-green-300"><Check className="h-4 w-4 shrink-0" /> Saved</span>
          ) : dirty.length > 0 ? (
            <span className="flex items-center gap-2 text-amber-200"><span className="h-2 w-2 rounded-full bg-amber-300" /> You have unsaved changes</span>
          ) : (
            <span className="text-ivory/40">All changes saved</span>
          )}
        </div>
        <button type="button" onClick={save} disabled={busy || dirty.length === 0} className="btn-gold w-full px-8 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- slide fields (add + edit)
function SlideFields({ form, setForm, imageUrl, setImageUrl, idPrefix }) {
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <>
      <div>
        <span className={labelClass}>Banner image</span>
        <ImageUploader value={imageUrl} onChange={setImageUrl} folder="amairah/hero" previewClassName="h-28 w-48" />
        {!imageUrl && <p className="mt-1.5 text-[13px] font-medium text-amber-300/90">An image is required.</p>}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-title`} className={labelClass}>Title</label>
        <textarea
          id={`${idPrefix}-title`}
          placeholder={"Timeless Scents,\nPremium Quality,\nLuxury Within Reach"}
          value={form.title}
          onChange={update("title")}
          rows={3}
          className={`${inputClass} resize-none`}
        />
        <p className="mt-1.5 text-[13px] font-medium text-ivory/50">Press Enter for a new line. The last line is shown in gold.</p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-sub`} className={labelClass}>Subtitle</label>
        <input id={`${idPrefix}-sub`} value={form.subtitle} onChange={update("subtitle")} placeholder="A short line under the title" className={inputClass} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-btn`} className={labelClass}>Button text</label>
          <input id={`${idPrefix}-btn`} value={form.button_text} onChange={update("button_text")} placeholder="Shop Now" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-link`} className={labelClass}>Button link</label>
          <input id={`${idPrefix}-link`} value={form.button_link} onChange={update("button_link")} placeholder="/shop" className={inputClass} />
        </div>
      </div>
    </>
  );
}

function SlideEditForm({ slide, onCancel, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(slide.image_url);
  const [form, setForm] = useState({
    title: slide.title || "",
    subtitle: slide.subtitle || "",
    button_text: slide.button_text || "",
    button_link: slide.button_link || "",
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await updateHeroSlide(slide.id, { ...form, image_url: imageUrl });
      if (result?.success) onSaved(result.slide);
      else setError(result?.error || "Could not save.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-gold-400/25 bg-white/[0.03] p-5">
      <SlideFields form={form} setForm={setForm} imageUrl={imageUrl} setImageUrl={setImageUrl} idPrefix={`edit-${slide.id}`} />
      {error && <p className="text-sm font-medium text-red-300">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy || !imageUrl} className="btn-gold flex-1 py-2.5 text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Save Changes"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-gold-400/10 px-5 py-2.5 text-sm text-ivory/60 transition-colors hover:border-gold-400/25 hover:text-ivory">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- main
const EMPTY = { title: "", subtitle: "", button_text: "", button_link: "" };

export default function HeroSlideManager({ slides, settings, onSaved }) {
  const [items, setItems] = useState(slides);
  useEffect(() => setItems(slides), [slides]);

  const [busyId, setBusyId] = useState(null);
  const [listError, setListError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY);
  const [imageUrl, setImageUrl] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const liveCount = items.filter((s) => s.is_active).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      const result = await createHeroSlide({ ...form, image_url: imageUrl });
      if (result?.success) {
        setItems((prev) => [...prev, result.slide]);
        setForm(EMPTY);
        setImageUrl(null);
      } else {
        setAddError(result?.error || "Something went wrong. Please try again.");
      }
    } catch {
      setAddError("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (s) => {
    setBusyId(s.id);
    setListError("");
    try {
      const result = await toggleHeroSlide(s.id, !s.is_active);
      if (result?.success) setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !s.is_active } : x)));
      else setListError(result?.error || "Could not update.");
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm("Delete this slide?")) return;
    setBusyId(s.id);
    setListError("");
    try {
      const result = await deleteHeroSlide(s.id);
      if (result?.success) setItems((prev) => prev.filter((x) => x.id !== s.id));
      else setListError(result?.error || "Could not delete.");
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <HeroSettingsPanel settings={settings} onSaved={onSaved} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ------------------------------------------------ slides */}
        <section className={`${panelClass} order-2 min-w-0 p-6 md:p-8 xl:order-1`}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg text-ivory">Banner slides</h2>
              <p className="mt-0.5 text-sm font-semibold text-ivory/65">The big images at the top of the homepage, in this order.</p>
            </div>
            <span className="rounded-full border border-gold-400/15 bg-gold-400/5 px-3 py-1 text-xs text-ivory/60">
              {items.length} total · <span className="text-green-300">{liveCount} live</span>
            </span>
          </div>

          {listError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300">{listError}</p>}

          {items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gold-400/15 px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
                <ImagePlus className="h-5 w-5" />
              </div>
              <p className="text-base text-ivory/70">No slides yet</p>
              <p className="mt-1 max-w-xs text-sm font-medium text-ivory/45">Until you add one, the homepage uses a default hero.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((s, i) =>
                editingId === s.id ? (
                  <li key={s.id}>
                    <SlideEditForm
                      slide={s}
                      onCancel={() => setEditingId(null)}
                      onSaved={(saved) => {
                        setItems((prev) => prev.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)));
                        setEditingId(null);
                      }}
                    />
                  </li>
                ) : (
                  <li key={s.id} className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row ${s.is_active ? "border-gold-400/10 bg-white/[0.02]" : "border-ivory/5 bg-white/[0.01] opacity-70"}`}>
                    <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl bg-ink sm:w-44">
                      <Image src={s.image_url} alt="" fill sizes="176px" className="object-cover" />
                      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-200 backdrop-blur-sm">Slide {i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[15px] font-semibold leading-snug text-ivory">
                        {s.title ? s.title.split("\n").filter(Boolean).join(" · ") : <span className="font-medium text-ivory/35">No title</span>}
                      </p>
                      {s.subtitle && <p className="mt-1 line-clamp-2 text-[13px] font-medium text-ivory/55">{s.subtitle}</p>}
                      {s.button_text && (
                        <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-gold-400/15 bg-gold-400/5 px-2.5 py-1 text-xs font-semibold text-gold-200">
                          <Link2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.button_text}{s.button_link ? ` → ${s.button_link}` : ""}</span>
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-gold-400/10 pt-3">
                        <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ivory/55">
                          <Switch size="sm" checked={s.is_active} disabled={busyId === s.id} onChange={() => handleToggle(s)} label={s.is_active ? "Hide slide" : "Show slide"} />
                          {s.is_active ? "Live" : "Hidden"}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingId(s.id)} disabled={busyId === s.id} aria-label="Edit slide" className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-gold-400/10 hover:text-gold-300">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(s)} disabled={busyId === s.id} aria-label="Delete slide" className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------ add */}
        <form onSubmit={handleAdd} className={`${panelClass} order-1 h-fit min-w-0 space-y-5 p-6 xl:order-2`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg text-ivory">Add slide</h2>
              <p className="mt-0.5 text-sm font-semibold text-ivory/65">Goes live right away</p>
            </div>
          </div>
          <SlideFields form={form} setForm={setForm} imageUrl={imageUrl} setImageUrl={setImageUrl} idPrefix="new" />
          {addError && (
            <p className="flex items-center gap-2 text-sm font-medium text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" /> {addError}
            </p>
          )}
          <button type="submit" disabled={adding || !imageUrl} className="btn-gold w-full disabled:opacity-60">
            {adding ? "Adding…" : "Add Slide"}
          </button>
        </form>
      </div>
    </div>
  );
}
