"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Tag, Copy, Check, Plus, Search, Sparkles, CalendarClock, ShoppingBag } from "lucide-react";
import { createCoupon, toggleCoupon, deleteCoupon } from "@/actions/admin/coupons";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-3 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 backdrop-blur-md";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";
const wrapClass =
  "flex items-center overflow-hidden rounded-xl border border-gold-400/10 bg-ink/40 transition-colors duration-300 focus-within:border-gold-400/40 focus-within:ring-1 focus-within:ring-gold-400/20 hover:border-gold-400/20";

const TABS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "off", label: "Off" },
  { key: "expired", label: "Expired" },
];

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function statusOf(c) {
  const expired = c.expires_at && new Date(c.expires_at) < new Date();
  if (expired) return "expired";
  return c.is_active ? "live" : "off";
}

function daysLeft(c) {
  if (!c.expires_at) return null;
  const ms = new Date(c.expires_at) - new Date();
  if (ms <= 0) return null;
  return Math.ceil(ms / 86400000);
}

function discountLabel(c) {
  return c.type === "percent" ? `${Number(c.value)}% OFF` : `${rupees(c.value)} OFF`;
}

// No look-alike characters (0/O, 1/I) so a code is easy to read out loud.
function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `AMR${s}`;
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
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function Stat({ label, value, tone = "" }) {
  return (
    <div className="rounded-2xl border border-gold-400/10 bg-ink-soft/40 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ivory/45">{label}</p>
      <p className={`mt-0.5 font-display text-2xl ${tone || "text-ivory"}`}>{value}</p>
    </div>
  );
}

export default function CouponsManager({ coupons }) {
  const router = useRouter();
  // Local copy: rows update the moment an action succeeds, and re-sync with fresh server data.
  const [items, setItems] = useState(coupons);
  useEffect(() => setItems(coupons), [coupons]);

  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [listError, setListError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // ---- create form
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [expires, setExpires] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [justCreated, setJustCreated] = useState("");

  const counts = useMemo(() => {
    const c = { live: 0, off: 0, expired: 0 };
    for (const x of items) c[statusOf(x)]++;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((c) => (tab === "all" ? true : statusOf(c) === tab)).filter((c) => (term ? c.code.toLowerCase().includes(term) : true));
  }, [items, tab, q]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setJustCreated("");
    setCreating(true);
    try {
      const fd = new FormData();
      fd.set("code", code);
      fd.set("type", type);
      fd.set("value", value);
      fd.set("min_purchase", minPurchase);
      fd.set("expires_at", expires);
      const result = await createCoupon({}, fd);
      if (result?.success) {
        setItems((prev) => [result.coupon, ...prev]);
        setJustCreated(result.coupon.code);
        setCode("");
        setValue("");
        setMinPurchase("");
        setExpires("");
        router.refresh();
      } else {
        setFormError(result?.error || "Could not create the coupon.");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (c) => {
    setBusyId(c.id);
    setListError("");
    try {
      const result = await toggleCoupon(c.id, !c.is_active);
      if (result?.success) {
        setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
        router.refresh();
      } else {
        setListError(result?.error || "Could not update the coupon.");
      }
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}? Customers will no longer be able to use it.`)) return;
    setBusyId(c.id);
    setListError("");
    try {
      const result = await deleteCoupon(c.id);
      if (result?.success) {
        setItems((prev) => prev.filter((x) => x.id !== c.id));
        router.refresh();
      } else {
        setListError(result?.error || "Could not delete the coupon.");
      }
    } catch {
      setListError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (c) => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((cur) => (cur === c.id ? null : cur)), 1600);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  // ---- live preview of the coupon being created
  const valueN = Number(value);
  const minN = Number(minPurchase);
  const previewText = valueN > 0
    ? `${type === "percent" ? `${valueN}% off` : `${rupees(valueN)} off`}${minN > 0 ? ` on orders of ${rupees(minN)} or more` : " on any order"}${expires ? `, valid till ${fmtDate(expires)}` : ""}`
    : "Fill in the value to see how it reads.";

  return (
    <div className="space-y-6">
      {/* overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total coupons" value={items.length} />
        <Stat label="Live now" value={counts.live} tone="text-green-300" />
        <Stat label="Switched off" value={counts.off} tone={counts.off ? "text-amber-300" : ""} />
        <Stat label="Expired" value={counts.expired} tone={counts.expired ? "text-red-300" : ""} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,390px)]">
        {/* ------------------------------------------------ list */}
        <div className={`${panelClass} order-2 min-w-0 p-5 sm:p-6 xl:order-1`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors duration-300 ${
                    tab === t.key ? "border-gold-400/30 bg-gold-400/10 text-gold-200" : "border-gold-400/10 text-ivory/45 hover:text-ivory"
                  }`}
                >
                  {t.label}
                  {t.key !== "all" && <span className="ml-1.5 text-ivory/35">{counts[t.key]}</span>}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search code…"
                className="w-full rounded-xl border border-gold-400/10 bg-ink-soft/40 py-2 pl-9 pr-3 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold-400/30 focus:outline-none"
              />
            </div>
          </div>

          {listError && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-300">{listError}</p>}

          {items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gold-400/15 px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
                <Tag className="h-5 w-5" />
              </div>
              <p className="text-base text-ivory/70">No coupons yet</p>
              <p className="mt-1 max-w-xs text-sm font-medium text-ivory/45">Create your first one on the right — for example AMAIRAH10 for 10% off.</p>
            </div>
          ) : shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-ivory/40">No coupon matches.</p>
          ) : (
            <ul className="space-y-3">
              {shown.map((c) => {
                const st = statusOf(c);
                const left = daysLeft(c);
                return (
                  <li
                    key={c.id}
                    className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                      st === "live" ? "border-gold-400/10 bg-white/[0.02]" : "border-ivory/5 bg-white/[0.01]"
                    }`}
                  >
                    {/* discount badge */}
                    <div
                      className={`flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed text-center ${
                        st === "live" ? "border-gold-400/40 bg-gold-400/10 text-gold-200" : "border-ivory/15 bg-ivory/5 text-ivory/40"
                      }`}
                    >
                      <span className="font-display text-lg font-semibold leading-none">
                        {c.type === "percent" ? `${Number(c.value)}%` : rupees(c.value)}
                      </span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest">off</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copy(c)}
                          title="Copy code"
                          className="group inline-flex items-center gap-2 rounded-lg border border-gold-400/15 bg-ink/50 px-2.5 py-1 font-mono text-sm font-semibold tracking-wider text-ivory transition-colors hover:border-gold-400/40"
                        >
                          {c.code}
                          {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-green-300" /> : <Copy className="h-3.5 w-3.5 text-ivory/35 group-hover:text-gold-300" />}
                        </button>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            st === "live" ? "bg-green-500/15 text-green-300" : st === "expired" ? "bg-red-500/15 text-red-300" : "bg-ivory/10 text-ivory/50"
                          }`}
                        >
                          {st === "live" ? "Live" : st === "expired" ? "Expired" : "Off"}
                        </span>
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-medium text-ivory/55">
                        <span className="inline-flex items-center gap-1.5">
                          <ShoppingBag className="h-3.5 w-3.5" />
                          {Number(c.min_purchase) > 0 ? `Orders of ${rupees(c.min_purchase)}+` : "Any order"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {c.expires_at
                            ? st === "expired"
                              ? `Expired ${fmtDate(c.expires_at)}`
                              : `Till ${fmtDate(c.expires_at)}${left !== null && left <= 7 ? ` · ${left} day${left === 1 ? "" : "s"} left` : ""}`
                            : "No expiry"}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gold-400/10 pt-3 sm:justify-end sm:border-0 sm:pt-0">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-ivory/50">
                        <span className="hidden sm:inline">{c.is_active ? "On" : "Off"}</span>
                        <Switch checked={c.is_active} disabled={busyId === c.id} onChange={() => handleToggle(c)} label={c.is_active ? `Switch off ${c.code}` : `Switch on ${c.code}`} />
                      </div>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={busyId === c.id}
                        aria-label={`Delete ${c.code}`}
                        className="rounded-xl p-2 text-ivory/40 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ------------------------------------------------ create */}
        <form onSubmit={handleCreate} className={`${panelClass} order-1 h-fit min-w-0 space-y-5 p-6 xl:order-2`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg text-ivory">Create coupon</h2>
              <p className="mt-0.5 text-sm font-semibold text-ivory/65">Goes live as soon as you save</p>
            </div>
          </div>

          {formError && <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300">{formError}</p>}
          {justCreated && (
            <p className="flex items-center gap-2 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-2.5 text-sm font-medium text-green-300">
              <Check className="h-4 w-4 shrink-0" /> Coupon {justCreated} created and live.
            </p>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="coupon-code" className="text-[13px] font-semibold uppercase tracking-wide text-ivory/60">Code</label>
              <button type="button" onClick={() => setCode(randomCode())} className="inline-flex items-center gap-1 text-xs font-semibold text-gold-300 hover:text-gold-200">
                <Sparkles className="h-3 w-3" /> Generate
              </button>
            </div>
            <input
              id="coupon-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              maxLength={24}
              placeholder="AMAIRAH10"
              className={`${inputClass} font-mono tracking-wider`}
            />
            <p className="mt-1.5 text-[13px] font-medium text-ivory/50">Customers type this at checkout. Letters, numbers, - and _ only.</p>
          </div>

          <div>
            <span className={labelClass}>Discount type</span>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-gold-400/10 bg-ink/40 p-1">
              {[
                { key: "percent", label: "Percent off" },
                { key: "flat", label: "Flat ₹ off" },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setType(o.key)}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${type === o.key ? "bg-gold-400/15 text-gold-100" : "text-ivory/50 hover:text-ivory"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="coupon-value" className={labelClass}>{type === "percent" ? "Percent" : "Amount"}</label>
            <div className={wrapClass}>
              {type === "flat" && <span className="select-none border-r border-gold-400/10 px-3.5 py-3 text-sm text-gold-300/80">₹</span>}
              <input
                id="coupon-value"
                required
                type="number"
                inputMode="numeric"
                min={1}
                max={type === "percent" ? 100 : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percent" ? "10" : "100"}
                className="w-full bg-transparent px-3.5 py-3 text-sm text-ivory placeholder:text-ivory/30 focus:outline-none"
              />
              {type === "percent" && <span className="select-none border-l border-gold-400/10 px-3.5 py-3 text-sm text-gold-300/80">%</span>}
            </div>
            {type === "percent" && <p className="mt-1.5 text-[13px] font-medium text-ivory/50">Between 1 and 100.</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div>
              <label htmlFor="coupon-min" className={labelClass}>Minimum order</label>
              <div className={wrapClass}>
                <span className="select-none border-r border-gold-400/10 px-3.5 py-3 text-sm text-gold-300/80">₹</span>
                <input
                  id="coupon-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent px-3.5 py-3 text-sm text-ivory placeholder:text-ivory/30 focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-[13px] font-medium text-ivory/50">0 = any order.</p>
            </div>
            <div>
              <label htmlFor="coupon-exp" className={labelClass}>Expires on</label>
              <input id="coupon-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={inputClass} />
              <p className="mt-1.5 text-[13px] font-medium text-ivory/50">Optional.</p>
            </div>
          </div>

          <div className="rounded-xl border border-gold-400/15 bg-gold-400/5 px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-300/90">Preview</p>
            <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-ivory/80">
              {code ? <span className="font-mono font-semibold text-gold-200">{code}</span> : <span className="text-ivory/40">YOUR CODE</span>} — {previewText}
            </p>
          </div>

          <button type="submit" disabled={creating} className="btn-gold w-full disabled:opacity-60">
            {creating ? "Creating…" : "Create Coupon"}
          </button>
        </form>
      </div>
    </div>
  );
}
