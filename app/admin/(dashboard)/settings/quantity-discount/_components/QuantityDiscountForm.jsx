"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Layers, Check, AlertCircle, Plus, Trash2, Percent, Info, ArrowRight } from "lucide-react";
import { updateQuantityDiscountSettings } from "@/actions/admin/quantityDiscount";
import { calculateQuantityDiscount } from "@/lib/constants";

const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-6 backdrop-blur-md md:p-8";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";
const wrapClass =
  "flex items-center overflow-hidden rounded-xl border border-gold-400/10 bg-ink/40 transition-colors duration-300 focus-within:border-gold-400/40 focus-within:ring-1 focus-within:ring-gold-400/20 hover:border-gold-400/20";

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${checked ? "bg-green-500" : "bg-ivory/15"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function QuantityDiscountForm({ settings }) {
  const [state, formAction, pending] = useActionState(updateQuantityDiscountSettings, {});

  const initial = useMemo(
    () => ({ enabled: Boolean(settings.enabled), tiers: (settings.tiers || []).map((t) => ({ min_quantity: t.min_quantity, discount: t.discount })) }),
    [settings]
  );
  const [enabled, setEnabled] = useState(initial.enabled);
  const [tiers, setTiers] = useState(initial.tiers);

  // "Unsaved changes" = anything different from the last saved rules.
  const current = JSON.stringify({ enabled, tiers });
  const baseline = useRef(JSON.stringify(initial));
  useEffect(() => {
    if (state?.success) baseline.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const dirty = current !== baseline.current;

  const updateTier = (idx, key, value) => setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  const addTier = () => {
    const lastQty = tiers.length > 0 ? Math.max(...tiers.map((t) => num(t.min_quantity))) : 0;
    setTiers((prev) => [...prev, { min_quantity: lastQty + 1, discount: 0 }]);
  };
  const removeTier = (idx) => setTiers((prev) => prev.filter((_, i) => i !== idx));
  const sortTiers = () => setTiers((prev) => [...prev].sort((a, b) => num(a.min_quantity) - num(b.min_quantity)));

  // ---- checks shown while editing
  const qtyCounts = tiers.reduce((m, t) => m.set(num(t.min_quantity), (m.get(num(t.min_quantity)) || 0) + 1), new Map());
  const hasDuplicate = [...qtyCounts.values()].some((c) => c > 1);
  const isSorted = tiers.every((t, i) => i === 0 || num(tiers[i - 1].min_quantity) <= num(t.min_quantity));

  // ---- live preview: same maths the cart and checkout use
  const cfg = { enabled, tiers: tiers.map((t) => ({ min_quantity: num(t.min_quantity), discount: num(t.discount) })) };
  const maxQty = Math.max(0, ...cfg.tiers.map((t) => t.min_quantity));
  const previewRows = Array.from({ length: Math.min(Math.max(maxQty + 1, 6), 12) }, (_, i) => i + 1).map((qty) => ({
    qty,
    discount: calculateQuantityDiscount(qty, cfg),
  }));

  return (
    <form action={formAction} className="space-y-6 pb-4">
      <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />
      {/* the action reads enabled === "on" */}
      {enabled && <input type="hidden" name="enabled" value="on" />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="min-w-0 space-y-6">
          {/* ------------------------------------------------ on / off */}
          <section className={`${panelClass} flex items-center justify-between gap-5`}>
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg text-ivory">Quantity discount</h2>
                <p className="mt-0.5 text-sm font-semibold text-ivory/65">
                  {enabled ? "On — applied automatically at cart and checkout." : "Off — customers get no quantity discount."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-semibold uppercase tracking-wider ${enabled ? "text-green-300" : "text-ivory/40"}`}>{enabled ? "On" : "Off"}</span>
              <Switch checked={enabled} onChange={() => setEnabled((v) => !v)} label="Enable automatic quantity discount" />
            </div>
          </section>

          {/* ------------------------------------------------ tiers */}
          <section className={`${panelClass} space-y-5 transition-opacity duration-300 ${enabled ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-ivory">Discount tiers</h2>
                <p className="mt-0.5 text-sm font-semibold text-ivory/65">Based on the total number of bottles in the cart (any size).</p>
              </div>
              {tiers.length > 1 && !isSorted && (
                <button type="button" onClick={sortTiers} className="rounded-full border border-gold-400/20 bg-gold-400/5 px-3.5 py-1.5 text-xs font-semibold text-gold-200 transition-colors hover:bg-gold-400/15">
                  Sort by quantity
                </button>
              )}
            </div>

            {hasDuplicate && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/5 px-3.5 py-3 text-[13px] font-medium leading-relaxed text-amber-200/90">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Two tiers use the same number of items. Only the last one counts — change one of them.
              </div>
            )}

            <ul className="space-y-3">
              {tiers.map((tier, i) => (
                <li key={i} className="rounded-2xl border border-gold-400/10 bg-white/[0.02] p-4">
                  <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
                    <div>
                      <label htmlFor={`qty-${i}`} className={labelClass}>If cart has at least</label>
                      <div className={wrapClass}>
                        <input
                          id={`qty-${i}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={tier.min_quantity}
                          onChange={(e) => updateTier(i, "min_quantity", e.target.value)}
                          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-ivory focus:outline-none"
                        />
                        <span className="select-none border-l border-gold-400/10 px-3.5 py-2.5 text-sm text-ivory/50">items</span>
                      </div>
                    </div>
                    <ArrowRight className="mb-3 hidden h-4 w-4 text-gold-300/60 sm:block" />
                    <div>
                      <label htmlFor={`disc-${i}`} className={labelClass}>Customer saves</label>
                      <div className={wrapClass}>
                        <span className="select-none border-r border-gold-400/10 px-3.5 py-2.5 text-sm text-gold-300/80">₹</span>
                        <input
                          id={`disc-${i}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={tier.discount}
                          onChange={(e) => updateTier(i, "discount", e.target.value)}
                          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-ivory focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      aria-label={`Remove tier ${i + 1}`}
                      className="mb-0.5 flex h-10 w-10 items-center justify-center justify-self-end rounded-xl text-ivory/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={addTier}
              className="flex items-center gap-1.5 text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200"
            >
              <Plus className="h-4 w-4" /> Add tier
            </button>

            <p className="text-[13px] font-medium leading-relaxed text-ivory/50">
              The highest tier the cart reaches is applied — it replaces the lower ones, it doesn&apos;t add to them. A tier of 5 applies to 5 or more
              items. Gift-set (bundle) bottles already have their own price and don&apos;t count here.
            </p>
          </section>
        </div>

        {/* ------------------------------------------------ preview */}
        <aside className={`${panelClass} h-fit space-y-4 xl:sticky xl:top-2`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg text-ivory">What customers get</h2>
              <p className="mt-0.5 text-sm font-semibold text-ivory/65">Updates as you edit</p>
            </div>
          </div>

          {enabled ? (
            <ul className="divide-y divide-gold-400/10 overflow-hidden rounded-xl border border-gold-400/15 bg-gold-400/5">
              {previewRows.map((r) => (
                <li key={r.qty} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[15px] font-medium">
                  <span className="text-ivory/75">
                    {r.qty} {r.qty === 1 ? "bottle" : "bottles"}
                  </span>
                  {r.discount > 0 ? (
                    <span className="font-semibold text-green-300">Save {rupees(r.discount)}</span>
                  ) : (
                    <span className="text-ivory/35">No discount</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-gold-400/15 bg-gold-400/5 px-4 py-4 text-[15px] font-medium text-ivory/60">
              The discount is switched off, so customers pay full price whatever the quantity.
            </p>
          )}
        </aside>
      </div>

      {/* ------------------------------------------------ save bar */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-400/15 bg-[#12100e]/95 px-5 py-3.5 shadow-2xl backdrop-blur-md">
        <div className="min-w-0 text-sm font-medium">
          {state.error ? (
            <span className="flex items-center gap-2 text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </span>
          ) : state.success && !dirty ? (
            <span className="flex items-center gap-2 text-green-300">
              <Check className="h-4 w-4 shrink-0" /> Quantity discount rules saved.
            </span>
          ) : dirty ? (
            <span className="flex items-center gap-2 text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-300" /> You have unsaved changes
            </span>
          ) : (
            <span className="text-ivory/40">All changes saved</span>
          )}
        </div>
        <button type="submit" disabled={pending} className="btn-gold px-8 py-2.5 text-sm disabled:opacity-60">
          {pending ? "Saving…" : "Save Rules"}
        </button>
      </div>
    </form>
  );
}
