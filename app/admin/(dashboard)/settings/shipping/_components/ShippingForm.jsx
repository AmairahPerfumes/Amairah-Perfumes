"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Truck, Check, AlertCircle, Banknote, Info, ArrowRight } from "lucide-react";
import { updateShippingSettings } from "@/actions/admin/shipping";
import { calculateCodAdvance } from "@/lib/constants";

const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-6 backdrop-blur-md md:p-8";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Number input with a ₹ prefix.
function MoneyField({ label, name, value, onChange, hint, max, disabled }) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label}</label>
      <div className={`flex items-center overflow-hidden rounded-xl border border-gold-400/10 bg-ink/40 transition-colors duration-300 focus-within:border-gold-400/40 focus-within:ring-1 focus-within:ring-gold-400/20 hover:border-gold-400/20 ${disabled ? "opacity-50" : ""}`}>
        <span className="select-none border-r border-gold-400/10 px-3.5 py-2.5 text-sm text-gold-300/80">₹</span>
        <input
          id={name}
          type="number"
          inputMode="numeric"
          min="0"
          max={max}
          name={name}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-ivory focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {hint && <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ivory/55">{hint}</p>}
    </div>
  );
}

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

function Notice({ tone = "info", children }) {
  const tones = {
    info: "border-gold-400/15 bg-ink/40 text-ivory/55",
    warn: "border-amber-400/25 bg-amber-400/5 text-amber-200/90",
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-medium leading-relaxed ${tones[tone]}`}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export default function ShippingForm({ shipping, codEnabled = true, onlineEnabled = true }) {
  const [state, formAction, pending] = useActionState(updateShippingSettings, {});
  const cod = shipping.cod_advance || {};

  const initial = useMemo(
    () => ({
      flat: String(shipping.flat_rate ?? 0),
      free: String(shipping.free_threshold ?? 0),
      codFee: String(shipping.cod_charge ?? 0),
      advOn: Boolean(cod.enabled),
      adv: String(cod.amount ?? 50),
      advHigh: String(cod.high_amount ?? 100),
      advFrom: String(cod.high_threshold ?? 0),
    }),
    [shipping, cod.enabled, cod.amount, cod.high_amount, cod.high_threshold]
  );

  const [flat, setFlat] = useState(initial.flat);
  const [free, setFree] = useState(initial.free);
  const [codFee, setCodFee] = useState(initial.codFee);
  const [advOn, setAdvOn] = useState(initial.advOn);
  const [adv, setAdv] = useState(initial.adv);
  const [advHigh, setAdvHigh] = useState(initial.advHigh);
  const [advFrom, setAdvFrom] = useState(initial.advFrom);

  // "Unsaved changes" = anything different from the last saved values.
  const current = JSON.stringify({ flat, free, codFee, advOn, adv, advHigh, advFrom });
  const baseline = useRef(JSON.stringify(initial));
  useEffect(() => {
    if (state?.success) baseline.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const dirty = current !== baseline.current;

  // ---- live summaries (same maths the checkout uses)
  const flatN = num(flat);
  const freeN = num(free);
  const codFeeN = num(codFee);
  const shippingLine =
    flatN <= 0
      ? "Shipping is free on every order."
      : freeN > 0
      ? `Customers pay ${rupees(flatN)} shipping; orders of ${rupees(freeN)} or more ship free.`
      : `Customers pay ${rupees(flatN)} shipping on every order.`;
  const codLine = codFeeN > 0 ? `Cash on Delivery orders pay an extra ${rupees(codFeeN)} fee.` : "No extra fee for Cash on Delivery.";

  const advCfg = { enabled: advOn, amount: num(adv), high_amount: num(advHigh), high_threshold: num(advFrom) };
  const examples = [999, 1999].map((total) => {
    const advance = calculateCodAdvance(total, advCfg);
    return { total, advance, balance: Math.max(0, total - advance) };
  });

  return (
    <form action={formAction} className="space-y-6 pb-4">
      {/* only sent when switched on (the action reads === "on") */}
      {advOn && <input type="hidden" name="cod_advance_enabled" value="on" />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ------------------------------------------------ delivery rates */}
        <section className={`${panelClass} space-y-5`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg text-ivory">Delivery Rates</h2>
              <p className="mt-0.5 text-sm font-semibold text-ivory/65">Shipping and Cash on Delivery charges</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoneyField label="Flat shipping rate" name="flat_rate" value={flat} onChange={setFlat} hint="Charged on every order. 0 = free shipping." />
            <MoneyField label="Free shipping from" name="free_threshold" value={free} onChange={setFree} hint="Orders at or above this amount ship free." />
          </div>
          <MoneyField label="Cash on Delivery fee" name="cod_charge" value={codFee} onChange={setCodFee} hint="Extra charge added to COD orders. 0 = no fee." />

          <div className="space-y-1.5 rounded-xl border border-gold-400/15 bg-gold-400/5 px-4 py-3.5 text-[15px] font-medium text-ivory/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300/90">What customers will see</p>
            <p>{shippingLine}</p>
            <p>{codLine}</p>
          </div>
        </section>

        {/* ------------------------------------------------ COD advance */}
        <section className={`${panelClass} space-y-5`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg text-ivory">COD Advance Payment</h2>
                <p className="mt-0.5 text-sm font-semibold text-ivory/65">Pay a small amount online, the rest on delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-semibold uppercase tracking-wider ${advOn ? "text-green-300" : "text-ivory/40"}`}>{advOn ? "On" : "Off"}</span>
              <Switch checked={advOn} onChange={() => setAdvOn((v) => !v)} label="Require advance payment for COD orders" />
            </div>
          </div>

          {advOn && !codEnabled && (
            <Notice tone="warn">
              Cash on Delivery is switched <strong>off</strong> for your store, so this has no effect yet. Turn it on in{" "}
              <Link href="/admin/settings" className="inline-flex items-center gap-1 font-semibold text-amber-100 underline-offset-2 hover:underline">
                Site Settings <ArrowRight className="h-3 w-3" />
              </Link>
              .
            </Notice>
          )}
          {advOn && !onlineEnabled && (
            <Notice tone="warn">Online payment (Razorpay) is off or not set up. The advance is paid online, so COD will work without an advance until it is on.</Notice>
          )}

          <div className={`space-y-4 transition-opacity duration-300 ${advOn ? "" : "opacity-50"}`}>
            <MoneyField label="Advance amount" name="cod_advance_amount" value={adv} onChange={setAdv} max={1000} disabled={!advOn} hint="Usually ₹50." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MoneyField label="Higher advance" name="cod_advance_high_amount" value={advHigh} onChange={setAdvHigh} max={1000} disabled={!advOn} hint="Optional, for bigger orders." />
              <MoneyField label="For orders from" name="cod_advance_high_threshold" value={advFrom} onChange={setAdvFrom} disabled={!advOn} hint="0 = always the standard advance." />
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-gold-400/15 bg-gold-400/5 px-4 py-3.5 text-[15px] font-medium">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300/90">How it works at checkout</p>
            {advOn ? (
              examples.map((e) => (
                <p key={e.total} className="flex flex-wrap items-baseline justify-between gap-x-3 text-ivory/75">
                  <span>Order total {rupees(e.total)}</span>
                  <span>
                    pay <strong className="text-gold-200">{rupees(e.advance)}</strong> now, <strong className="text-ivory">{rupees(e.balance)}</strong> on delivery
                  </span>
                </p>
              ))
            ) : (
              <p className="text-ivory/55">Off — COD customers pay the full amount when the parcel arrives.</p>
            )}
          </div>
          <p className="text-[13px] font-medium text-ivory/50">Order total = items + shipping + COD fee − discounts.</p>
        </section>
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
              <Check className="h-4 w-4 shrink-0" /> Shipping settings saved.
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
          {pending ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
