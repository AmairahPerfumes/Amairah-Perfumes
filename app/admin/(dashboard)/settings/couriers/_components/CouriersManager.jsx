"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Truck, Plus, ExternalLink, Link2Off, Eye, EyeOff, Info } from "lucide-react";
import { createCourier, updateCourier, toggleCourier, deleteCourier } from "@/actions/admin/couriers";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-2.5 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 backdrop-blur-md";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ivory/50";

// Name-only shortcuts (no link is guessed — add the courier's own tracking page yourself).
const PRESETS = ["DTDC", "Blue Dart", "Speed Post", "Professional Couriers", "Ecom Express", "XpressBees"];
const SAMPLE_ID = "EE123456789IN";

function previewUrl(template) {
  const t = String(template || "").trim();
  if (!t) return "";
  return t.replaceAll("{tracking_id}", SAMPLE_ID);
}

function CourierFields({ form, setForm, idPrefix }) {
  const hasPlaceholder = form.tracking_url_template.includes("{tracking_id}");
  const preview = previewUrl(form.tracking_url_template);
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-name`} className={labelClass}>Courier name</label>
        <input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          maxLength={60}
          placeholder="e.g. India Post"
          className={inputClass}
          required
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-link`} className={labelClass}>
          Tracking link <span className="font-normal normal-case tracking-normal text-ivory/30">(optional)</span>
        </label>
        <input
          id={`${idPrefix}-link`}
          value={form.tracking_url_template}
          onChange={(e) => setForm((f) => ({ ...f, tracking_url_template: e.target.value }))}
          placeholder="https://…?id={tracking_id}"
          className={`${inputClass} font-mono text-xs`}
        />
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-ink/40 px-3 py-2.5 text-xs leading-relaxed text-ivory/45">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300/70" />
          <p>
            Put <code className="rounded bg-ink px-1 py-0.5 text-gold-200">{"{tracking_id}"}</code> where the tracking number goes — it is filled in
            for each order. Without it, customers just open the page you enter.
          </p>
        </div>
        {preview && (
          <p className="mt-2 break-all text-xs text-ivory/40">
            {hasPlaceholder ? "Example for ID " : "Opens "}
            {hasPlaceholder && <span className="font-mono text-ivory/60">{SAMPLE_ID}</span>}
            {hasPlaceholder && ": "}
            <span className="font-mono text-gold-200/80">{preview}</span>
          </p>
        )}
      </div>
    </>
  );
}

function EditForm({ courier, onCancel, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: courier.name, tracking_url_template: courier.tracking_url_template || "" });
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await updateCourier(courier.id, form);
      if (result?.success) onSaved(result.courier);
      else setError(result?.error || "Could not save.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-gold-400/25 bg-white/[0.03] p-5">
      <CourierFields form={form} setForm={setForm} idPrefix={`edit-${courier.id}`} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-gold flex-1 py-2.5 text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-gold-400/10 px-5 py-2.5 text-sm text-ivory/60 transition-colors hover:border-gold-400/25 hover:text-ivory"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${checked ? "bg-green-500" : "bg-ivory/15"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

export default function CouriersManager({ couriers }) {
  const router = useRouter();
  // Local copy: rows update the instant an action succeeds, and re-sync with fresh server data.
  const [items, setItems] = useState(couriers);
  useEffect(() => setItems(couriers), [couriers]);

  const [busyId, setBusyId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", tracking_url_template: "" });
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const activeCount = items.filter((c) => c.is_active).length;
  const existingKeys = useMemo(() => new Set(items.map((c) => c.name.trim().toLowerCase())), [items]);
  const presets = PRESETS.filter((p) => !existingKeys.has(p.toLowerCase()));

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      const result = await createCourier(form);
      if (result?.success) {
        setItems((prev) => [...prev, result.courier]);
        setForm({ name: "", tracking_url_template: "" });
        router.refresh();
      } else {
        setError(result?.error || "Could not save.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (c) => {
    setBusyId(c.id);
    setListError("");
    try {
      const result = await toggleCourier(c.id, !c.is_active);
      if (result?.success) {
        setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
        router.refresh();
      } else {
        setListError(result?.error || "Could not update the courier.");
      }
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? Orders already shipped with it keep their tracking details.`)) return;
    setBusyId(c.id);
    setListError("");
    try {
      const result = await deleteCourier(c.id);
      if (result?.success) {
        setItems((prev) => prev.filter((x) => x.id !== c.id));
        router.refresh();
      } else {
        setListError(result?.error || "Could not delete the courier.");
      }
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      {/* ---------------------------------------------------------------- list */}
      <div className={`${panelClass} order-2 min-w-0 p-6 md:p-8 xl:order-1`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-ivory">Your Couriers</h2>
          <span className="rounded-full border border-gold-400/15 bg-gold-400/5 px-3 py-1 text-xs text-ivory/60">
            {items.length} total · <span className="text-green-300">{activeCount} active</span>
          </span>
        </div>

        {listError && (
          <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-300">{listError}</p>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gold-400/15 px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
              <Truck className="h-5 w-5" />
            </div>
            <p className="text-base text-ivory/70">No couriers yet</p>
            <p className="mt-1 max-w-xs text-sm text-ivory/40">Add one on the right — for example India Post — and it will show up in the courier list on every order.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((c) =>
              editingId === c.id ? (
                <li key={c.id}>
                  <EditForm
                    courier={c}
                    onCancel={() => setEditingId(null)}
                    onSaved={(saved) => {
                      setItems((prev) => prev.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)));
                      setEditingId(null);
                      router.refresh();
                    }}
                  />
                </li>
              ) : (
                <li
                  key={c.id}
                  className={`flex flex-col gap-4 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center ${
                    c.is_active ? "border-gold-400/10 bg-white/[0.02]" : "border-ivory/5 bg-white/[0.01] opacity-70"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border font-display text-lg ${
                        c.is_active ? "border-gold-400/25 bg-gold-400/10 text-gold-200" : "border-ivory/10 bg-ivory/5 text-ivory/40"
                      }`}
                    >
                      {c.name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-medium text-ivory">{c.name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            c.is_active ? "bg-green-500/15 text-green-300" : "bg-ivory/10 text-ivory/50"
                          }`}
                        >
                          {c.is_active ? "Active" : "Hidden"}
                        </span>
                      </div>
                      {c.tracking_url_template ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ivory/45">
                          <ExternalLink className="h-3 w-3 shrink-0 text-gold-300/70" />
                          <span className="truncate font-mono">{c.tracking_url_template}</span>
                        </p>
                      ) : (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ivory/35">
                          <Link2Off className="h-3 w-3 shrink-0" /> No tracking link — customers see the ID only
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gold-400/10 pt-3 sm:justify-end sm:border-0 sm:pt-0">
                    <div className="flex items-center gap-2 text-xs text-ivory/50">
                      {c.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      <Switch
                        checked={c.is_active}
                        disabled={busyId === c.id}
                        onChange={() => handleToggle(c)}
                        label={c.is_active ? `Hide ${c.name}` : `Show ${c.name}`}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingId(c.id)}
                        disabled={busyId === c.id}
                        aria-label={`Edit ${c.name}`}
                        className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-gold-400/10 hover:text-gold-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={busyId === c.id}
                        aria-label={`Delete ${c.name}`}
                        className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
        <p className="mt-5 text-xs text-ivory/30">
          A hidden courier stays saved but is not offered in the courier list on new shipments.
        </p>
      </div>

      {/* ---------------------------------------------------------------- add */}
      <form onSubmit={handleAdd} className={`${panelClass} order-1 h-fit min-w-0 space-y-4 p-6 xl:order-2`}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
            <Plus className="h-4 w-4" />
          </div>
          <h2 className="font-display text-base text-ivory">Add Courier</h2>
        </div>

        {presets.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-ivory/40">Quick fill the name:</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, name: p }))}
                  className="rounded-full border border-gold-400/15 bg-gold-400/5 px-3 py-1 text-xs text-gold-200 transition-colors hover:bg-gold-400/15"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <CourierFields form={form} setForm={setForm} idPrefix="new" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={adding} className="btn-gold w-full disabled:opacity-60">
          {adding ? "Saving…" : "Add Courier"}
        </button>
      </form>
    </div>
  );
}
