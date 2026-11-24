"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  AlertCircle,
  Building2,
  Phone,
  Share2,
  Wallet,
  Mail,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Banknote,
  CreditCard,
  Info,
  ArrowRight,
} from "lucide-react";
import { updateSiteSetting } from "@/actions/settings";

const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-6 backdrop-blur-md md:p-8";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";
const wrapClass =
  "flex items-center overflow-hidden rounded-xl border bg-ink/40 transition-colors duration-300 focus-within:ring-1 hover:border-gold-400/20";

// Which cards to show, in this order. (Home-page content has its own page.)
const SECTIONS = [
  { key: "payment", label: "Payment Methods", sub: "What customers can choose at checkout", icon: Wallet },
  { key: "brand", label: "Brand Information", sub: "Your store name and tagline", icon: Building2 },
  { key: "contact", label: "Contact Details", sub: "How customers reach you", icon: Phone },
  { key: "social", label: "Social Media", sub: "Links shown in the website footer", icon: Share2 },
];

// Friendly label / hint / icon per setting. Anything not listed falls back to its description.
const FIELDS = {
  brand_name: { label: "Brand name", hint: "Shown in the header, footer and emails." },
  tagline: { label: "Tagline", hint: "A short line that describes your store." },
  email: { label: "Business email", icon: Mail, type: "email", placeholder: "you@example.com", hint: "Shown on the Contact page and in the footer." },
  whatsapp_number: {
    label: "WhatsApp number",
    icon: MessageCircle,
    type: "tel",
    placeholder: "917801087892",
    hint: "Country code first, digits only — no + or spaces. Example: 917801087892. Used for the chat links.",
  },
  whatsapp_display: { label: "WhatsApp number (as shown)", icon: Phone, placeholder: "+91 78010 87892", hint: "How the number is written on the site." },
  instagram_url: { label: "Instagram", icon: Instagram, type: "url", placeholder: "https://www.instagram.com/yourpage", hint: "Leave empty to hide the icon." },
  facebook_url: { label: "Facebook", icon: Facebook, type: "url", placeholder: "https://www.facebook.com/yourpage", hint: "Leave empty to hide the icon." },
  youtube_url: { label: "YouTube", icon: Youtube, type: "url", placeholder: "https://youtube.com/@yourchannel", hint: "Leave empty to hide the icon." },
};

const TOGGLES = {
  cod_enabled: {
    title: "Cash on Delivery",
    icon: Banknote,
    on: "Customers can choose Cash on Delivery at checkout.",
    off: "Cash on Delivery is hidden at checkout — customers must pay online.",
    linkText: "COD fee & advance payment",
  },
  online_payment_enabled: {
    title: "Online payment (Razorpay)",
    icon: CreditCard,
    on: "Customers can pay by card, UPI or netbanking.",
    off: "Online payment is hidden at checkout. Pre-orders and COD advance need it.",
  },
};

function validate(key, value) {
  const v = String(value ?? "").trim();
  const meta = FIELDS[key];
  if (!meta) return null;
  if (key === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
  if (key === "whatsapp_number" && v && !/^\d{10,15}$/.test(v)) return "Digits only, with country code (10–15 digits).";
  if (meta.type === "url" && v && !/^https?:\/\/\S+$/i.test(v)) return "Must start with https:// and have no spaces.";
  return null;
}

function Switch({ checked }) {
  return (
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${checked ? "bg-green-500" : "bg-ivory/15"}`}>
      <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </span>
  );
}

export default function SettingsForm({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings || {});
  // last saved value of every key — "unsaved" means different from this
  const [base, setBase] = useState(() => Object.fromEntries(Object.entries(initialSettings || {}).map(([k, v]) => [k, v.value])));
  const [savingCategory, setSavingCategory] = useState(null);
  const [saved, setSaved] = useState(null);

  const handleChange = (key, value) => {
    setSaved(null);
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  const grouped = useMemo(() => {
    const g = {};
    Object.entries(settings).forEach(([key, data]) => {
      if (!SECTIONS.some((s) => s.key === data.category)) return;
      (g[data.category] ||= []).push({ key, ...data });
    });
    return g;
  }, [settings]);

  const handleSaveSection = async (category, items) => {
    setSaved(null);
    setSavingCategory(category);
    try {
      const changed = items.filter((i) => settings[i.key].value !== base[i.key]);
      const results = await Promise.all(changed.map((item) => updateSiteSetting(item.key, settings[item.key].value)));
      const failed = results.find((r) => !r.success);
      if (failed) {
        setSaved({ category, success: false, error: failed.error || "Could not save." });
      } else {
        setBase((prev) => ({ ...prev, ...Object.fromEntries(changed.map((i) => [i.key, settings[i.key].value])) }));
        setSaved({ category, success: true });
      }
    } catch {
      setSaved({ category, success: false, error: "Something went wrong. Please try again." });
    } finally {
      setSavingCategory(null);
    }
  };

  const codOn = settings.cod_enabled?.value !== "false";
  const onlineOn = settings.online_payment_enabled?.value !== "false";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {SECTIONS.map((section) => {
        const items = grouped[section.key];
        if (!items) return null;
        const dirtyCount = items.filter((i) => i.value !== base[i.key]).length;
        const hasError = items.some((i) => validate(i.key, i.value));
        const isSaving = savingCategory === section.key;
        const wide = section.key === "payment" || section.key === "social";

        return (
          <section key={section.key} className={`${panelClass} flex flex-col ${wide ? "xl:col-span-2" : ""}`}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
                  <section.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg text-ivory">{section.label}</h2>
                  <p className="mt-0.5 text-sm font-semibold text-ivory/65">{section.sub}</p>
                </div>
              </div>
            </div>

            {section.key === "payment" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {items.map((item) => {
                    const t = TOGGLES[item.key];
                    if (!t) return null;
                    const isOn = item.value !== "false";
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        onClick={() => handleChange(item.key, isOn ? "false" : "true")}
                        className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-colors duration-300 ${
                          isOn ? "border-green-400/30 bg-green-400/5" : "border-gold-400/10 bg-ink/40 hover:border-gold-400/25"
                        }`}
                      >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isOn ? "bg-green-400/15 text-green-300" : "bg-ivory/10 text-ivory/45"}`}>
                          <t.icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-base font-semibold text-ivory">{t.title}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isOn ? "bg-green-500/15 text-green-300" : "bg-ivory/10 text-ivory/50"}`}>
                              {isOn ? "On" : "Off"}
                            </span>
                          </span>
                          <span className="mt-1 block text-sm font-medium leading-snug text-ivory/60">{isOn ? t.on : t.off}</span>
                        </span>
                        <Switch checked={isOn} />
                      </button>
                    );
                  })}
                </div>

                {!codOn && !onlineOn && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Both payment methods are off — customers won&apos;t be able to place orders.
                  </div>
                )}

                <div className="flex items-start gap-2.5 rounded-xl border border-gold-400/15 bg-ink/40 px-4 py-3 text-[13px] font-medium leading-relaxed text-ivory/60">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300/80" />
                  <p>
                    Set the COD fee, shipping charges and the COD advance in{" "}
                    <Link href="/admin/settings/shipping" className="inline-flex items-center gap-1 font-semibold text-gold-200 underline-offset-2 hover:underline">
                      Shipping Settings <ArrowRight className="h-3 w-3" />
                    </Link>
                    .
                  </p>
                </div>
              </div>
            ) : (
              <div className={`grid grid-cols-1 gap-5 ${section.key === "social" ? "lg:grid-cols-3" : ""}`}>
                {items.map((item) => {
                  const meta = FIELDS[item.key] || {};
                  const error = validate(item.key, item.value);
                  const Icon = meta.icon;
                  const long = String(item.value ?? "").length > 80;
                  return (
                    <div key={item.key}>
                      <label htmlFor={item.key} className={labelClass}>{meta.label || item.description || item.key}</label>
                      <div className={`${wrapClass} ${error ? "border-red-400/50 focus-within:border-red-400/60 focus-within:ring-red-400/20" : "border-gold-400/10 focus-within:border-gold-400/40 focus-within:ring-gold-400/20"}`}>
                        {Icon && (
                          <span className="flex select-none items-center border-r border-gold-400/10 px-3.5 py-3 text-gold-300/80">
                            <Icon className="h-4 w-4" />
                          </span>
                        )}
                        {long ? (
                          <textarea
                            id={item.key}
                            value={item.value}
                            onChange={(e) => handleChange(item.key, e.target.value)}
                            rows={3}
                            className="w-full resize-none bg-transparent px-3.5 py-3 text-sm text-ivory focus:outline-none"
                          />
                        ) : (
                          <input
                            id={item.key}
                            type="text"
                            inputMode={meta.type === "tel" ? "numeric" : meta.type === "email" ? "email" : meta.type === "url" ? "url" : undefined}
                            value={item.value}
                            onChange={(e) => handleChange(item.key, e.target.value)}
                            placeholder={meta.placeholder}
                            className="w-full bg-transparent px-3.5 py-3 text-sm text-ivory placeholder:text-ivory/30 focus:outline-none"
                          />
                        )}
                      </div>
                      {error ? (
                        <p className="mt-1.5 text-[13px] font-medium text-red-300">{error}</p>
                      ) : (
                        meta.hint && <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ivory/50">{meta.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* save row */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-gold-400/10 pt-5">
              <div className="min-w-0 text-sm font-medium">
                {saved?.category === section.key && !saved.success ? (
                  <span className="flex items-center gap-2 text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {saved.error}
                  </span>
                ) : saved?.category === section.key && saved.success && dirtyCount === 0 ? (
                  <span className="flex items-center gap-2 text-green-300">
                    <Check className="h-4 w-4 shrink-0" /> Saved
                  </span>
                ) : dirtyCount > 0 ? (
                  <span className="flex items-center gap-2 text-amber-200">
                    <span className="h-2 w-2 rounded-full bg-amber-300" /> You have unsaved changes
                  </span>
                ) : (
                  <span className="text-ivory/40">All changes saved</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSaveSection(section.key, items)}
                disabled={isSaving || dirtyCount === 0 || hasError}
                className="btn-gold px-8 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
