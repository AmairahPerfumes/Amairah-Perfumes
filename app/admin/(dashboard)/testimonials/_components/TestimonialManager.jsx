"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Trash2, Pencil, Quote, Plus, Star } from "lucide-react";
import StarRating from "@/components/StarRating";
import ImageUploader from "@/components/admin/ImageUploader";
import Switch from "@/components/admin/Switch";
import { createTestimonial, updateTestimonial, toggleTestimonial, deleteTestimonial } from "@/actions/admin/testimonials";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-3 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 backdrop-blur-md";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";
const RATING_OPTIONS = [5, 4.5, 4, 3.5, 3];
const EMPTY = { customer_name: "", location: "", review_text: "", rating: 5 };

function Stat({ label, value, tone = "" }) {
  return (
    <div className="rounded-2xl border border-gold-400/10 bg-ink-soft/40 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ivory/45">{label}</p>
      <p className={`mt-0.5 font-display text-2xl ${tone || "text-ivory"}`}>{value}</p>
    </div>
  );
}

function RatingPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RATING_OPTIONS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`inline-flex items-center gap-1 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors duration-300 ${
            Number(value) === r ? "border-gold-400/40 bg-gold-400/10 text-gold-200" : "border-gold-400/10 bg-ink/40 text-ivory/55 hover:border-gold-400/20"
          }`}
        >
          {r} <Star className="h-3.5 w-3.5 fill-current" />
        </button>
      ))}
    </div>
  );
}

function Avatar({ url, name, className = "h-12 w-12" }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border border-gold-400/20 bg-ink ${className}`}>
      {url ? (
        <Image src={url} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-base text-gold-200/80">
          {(name || "?").trim().charAt(0).toUpperCase() || <Quote className="h-4 w-4" />}
        </div>
      )}
    </div>
  );
}

// Same fields for adding and editing.
function Fields({ form, setForm, imageUrl, setImageUrl, idPrefix }) {
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <>
      <div>
        <span className={labelClass}>Photo <span className="font-normal normal-case tracking-normal text-ivory/40">(optional)</span></span>
        <ImageUploader value={imageUrl} onChange={setImageUrl} folder="amairah/testimonials" previewClassName="h-20 w-20" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-name`} className={labelClass}>Customer name</label>
          <input id={`${idPrefix}-name`} value={form.customer_name} onChange={update("customer_name")} maxLength={80} placeholder="e.g. Aisha K." className={inputClass} required />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-loc`} className={labelClass}>City <span className="font-normal normal-case tracking-normal text-ivory/40">(optional)</span></label>
          <input id={`${idPrefix}-loc`} value={form.location} onChange={update("location")} maxLength={60} placeholder="e.g. Delhi" className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-text`} className={labelClass}>What they said</label>
        <textarea id={`${idPrefix}-text`} value={form.review_text} onChange={update("review_text")} maxLength={600} rows={4} placeholder="The review text…" className={`${inputClass} resize-none`} required />
        <p className="mt-1.5 text-right text-[13px] font-medium text-ivory/45">{form.review_text.length}/600</p>
      </div>
      <div>
        <span className={labelClass}>Rating</span>
        <RatingPicker value={form.rating} onChange={(r) => setForm((f) => ({ ...f, rating: r }))} />
      </div>
    </>
  );
}

function EditForm({ testimonial, onCancel, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(testimonial.image_url);
  const [form, setForm] = useState({
    customer_name: testimonial.customer_name || "",
    location: testimonial.location || "",
    review_text: testimonial.review_text || "",
    rating: testimonial.rating || 5,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await updateTestimonial(testimonial.id, { ...form, image_url: imageUrl });
      if (result?.success) onSaved(result.testimonial);
      else setError(result?.error || "Could not save.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-gold-400/25 bg-white/[0.03] p-5">
      <Fields form={form} setForm={setForm} imageUrl={imageUrl} setImageUrl={setImageUrl} idPrefix={`edit-${testimonial.id}`} />
      {error && <p className="text-sm font-medium text-red-300">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-gold flex-1 py-2.5 text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Save Changes"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-gold-400/10 px-5 py-2.5 text-sm text-ivory/60 transition-colors hover:border-gold-400/25 hover:text-ivory">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function TestimonialManager({ testimonials }) {
  const [items, setItems] = useState(testimonials);
  useEffect(() => setItems(testimonials), [testimonials]);

  const [busyId, setBusyId] = useState(null);
  const [listError, setListError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY);
  const [imageUrl, setImageUrl] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [justAdded, setJustAdded] = useState("");

  const liveCount = items.filter((t) => t.is_active).length;
  const avg = useMemo(() => {
    const rated = items.filter((t) => Number(t.rating) > 0);
    return rated.length ? (rated.reduce((s, t) => s + Number(t.rating), 0) / rated.length).toFixed(1) : "—";
  }, [items]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError("");
    setJustAdded("");
    setAdding(true);
    try {
      const result = await createTestimonial({ ...form, image_url: imageUrl });
      if (result?.success) {
        setItems((prev) => [...prev, result.testimonial]);
        setJustAdded(form.customer_name);
        setForm(EMPTY);
        setImageUrl(null);
      } else {
        setAddError(result?.error || "Could not add the testimonial.");
      }
    } catch {
      setAddError("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (t) => {
    setBusyId(t.id);
    setListError("");
    try {
      const result = await toggleTestimonial(t.id, !t.is_active);
      if (result?.success) setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: !t.is_active } : x)));
      else setListError(result?.error || "Could not update.");
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete the testimonial from ${t.customer_name}?`)) return;
    setBusyId(t.id);
    setListError("");
    try {
      const result = await deleteTestimonial(t.id);
      if (result?.success) setItems((prev) => prev.filter((x) => x.id !== t.id));
      else setListError(result?.error || "Could not delete.");
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Testimonials" value={items.length} />
        <Stat label="Live on homepage" value={liveCount} tone="text-green-300" />
        <Stat label="Switched off" value={items.length - liveCount} tone={items.length - liveCount ? "text-amber-300" : ""} />
        <Stat label="Average rating" value={avg} tone="text-gold-200" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ------------------------------------------------ list */}
        <div className={`${panelClass} order-2 min-w-0 p-6 md:p-8 xl:order-1`}>
          <h2 className="font-display text-lg text-ivory">Customer quotes</h2>
          <p className="mb-5 mt-0.5 text-sm font-semibold text-ivory/65">Switched-on quotes appear in the &quot;Customer Voices&quot; carousel.</p>

          {listError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300">{listError}</p>}

          {items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gold-400/15 px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
                <Quote className="h-5 w-5" />
              </div>
              <p className="text-base text-ivory/70">No testimonials yet</p>
              <p className="mt-1 max-w-xs text-sm font-medium text-ivory/45">Until you add some, the homepage shows default sample quotes.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((t) =>
                editingId === t.id ? (
                  <li key={t.id}>
                    <EditForm
                      testimonial={t}
                      onCancel={() => setEditingId(null)}
                      onSaved={(saved) => {
                        setItems((prev) => prev.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)));
                        setEditingId(null);
                      }}
                    />
                  </li>
                ) : (
                  <li
                    key={t.id}
                    className={`rounded-2xl border p-4 sm:p-5 ${t.is_active ? "border-gold-400/10 bg-white/[0.02]" : "border-ivory/5 bg-white/[0.01] opacity-70"}`}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar url={t.image_url} name={t.customer_name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-base font-semibold text-ivory">{t.customer_name}</p>
                          {t.location && <span className="text-[13px] font-medium text-ivory/45">{t.location}</span>}
                          <StarRating rating={Number(t.rating)} size={13} />
                        </div>
                        <p className="mt-2 line-clamp-3 text-[15px] font-medium leading-relaxed text-ivory/70">&ldquo;{t.review_text}&rdquo;</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-gold-400/10 pt-3">
                      <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ivory/55">
                        <Switch size="sm" checked={t.is_active} disabled={busyId === t.id} onChange={() => handleToggle(t)} label={t.is_active ? "Switch off" : "Switch on"} />
                        {t.is_active ? "Live" : "Switched off"}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingId(t.id)} disabled={busyId === t.id} aria-label={`Edit ${t.customer_name}`} className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-gold-400/10 hover:text-gold-300">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(t)} disabled={busyId === t.id} aria-label={`Delete ${t.customer_name}`} className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-red-500/10 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </div>

        {/* ------------------------------------------------ add */}
        <form onSubmit={handleAdd} className={`${panelClass} order-1 h-fit min-w-0 space-y-5 p-6 xl:order-2`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg text-ivory">Add testimonial</h2>
              <p className="mt-0.5 text-sm font-semibold text-ivory/65">Goes live right away</p>
            </div>
          </div>

          {justAdded && <p className="rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-2.5 text-sm font-medium text-green-300">Testimonial from {justAdded} added.</p>}
          {addError && <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300">{addError}</p>}

          <Fields form={form} setForm={setForm} imageUrl={imageUrl} setImageUrl={setImageUrl} idPrefix="new" />

          {(form.customer_name || form.review_text) && (
            <div className="rounded-xl border border-gold-400/15 bg-gold-400/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-300/90">Preview</p>
              <div className="flex items-start gap-3">
                <Avatar url={imageUrl} name={form.customer_name} className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ivory">
                    {form.customer_name || "Customer"}
                    {form.location && <span className="ml-2 font-medium text-ivory/45">{form.location}</span>}
                  </p>
                  <StarRating rating={Number(form.rating)} size={12} />
                  <p className="mt-1.5 line-clamp-3 text-sm font-medium text-ivory/70">&ldquo;{form.review_text || "…"}&rdquo;</p>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={adding} className="btn-gold w-full disabled:opacity-60">
            {adding ? "Adding…" : "Add Testimonial"}
          </button>
        </form>
      </div>
    </div>
  );
}
