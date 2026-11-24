"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Check, AlertCircle } from "lucide-react";
import { updateBundleSettings } from "@/actions/admin/bundle";
import ImageUploader from "@/components/admin/ImageUploader";
import Switch from "@/components/admin/Switch";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-3 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";
const wrapClass =
  "flex items-center overflow-hidden rounded-xl border border-gold-400/10 bg-ink/40 transition-colors duration-300 focus-within:border-gold-400/40 focus-within:ring-1 focus-within:ring-gold-400/20 hover:border-gold-400/20";
const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function BundleSettingsForm({ settings }) {
  const [state, formAction, pending] = useActionState(updateBundleSettings, {});

  const initial = useMemo(
    () => ({
      enabled: Boolean(settings.enabled),
      count: String(settings.bottle_count ?? 4),
      price: settings.fixed_price == null ? "" : String(settings.fixed_price),
      title: settings.title || "",
      subtitle: settings.subtitle || "",
      image: settings.banner_image_url || "",
    }),
    [settings]
  );
  const [enabled, setEnabled] = useState(initial.enabled);
  const [count, setCount] = useState(initial.count);
  const [price, setPrice] = useState(initial.price);
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [image, setImage] = useState(initial.image);

  const current = JSON.stringify({ enabled, count, price, title, subtitle, image });
  const baseline = useRef(JSON.stringify(initial));
  useEffect(() => {
    if (state?.success) baseline.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const dirty = current !== baseline.current;

  const countN = Number(count);
  const priceN = Number(price);
  const preview =
    countN >= 2 && priceN > 0
      ? `Pick any ${countN} bottles for ${rupees(priceN)} — whatever the individual prices.`
      : countN >= 2
      ? `Pick any ${countN} bottles — customers pay the sum of the individual prices.`
      : "Enter how many bottles make a set.";

  return (
    <form action={formAction} className="h-fit space-y-5 rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-6 backdrop-blur-md md:p-8">
      <input type="hidden" name="banner_image_url" value={image || ""} />
      {enabled && <input type="hidden" name="enabled" value="on" />}

      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg text-ivory">Bundle settings</h2>
          <p className="mt-0.5 text-sm font-semibold text-ivory/65">How the gift set works for customers</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-gold-400/10 bg-ink/30 px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ivory">Gift Set page</p>
          <p className="mt-0.5 text-[13px] font-medium text-ivory/55">{enabled ? "Live — shown in the menu and at /bundle." : "Hidden — customers can't see it."}</p>
        </div>
        <Switch checked={enabled} onChange={() => setEnabled((v) => !v)} label="Show the Gift Set page and menu link" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bottle_count" className={labelClass}>Bottles to pick</label>
          <div className={wrapClass}>
            <input
              id="bottle_count"
              type="number"
              inputMode="numeric"
              name="bottle_count"
              min={2}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full bg-transparent px-3.5 py-3 text-sm text-ivory focus:outline-none"
            />
            <span className="select-none border-l border-gold-400/10 px-3.5 py-3 text-sm text-ivory/50">bottles</span>
          </div>
          <p className="mt-1.5 text-[13px] font-medium text-ivory/50">A set needs exactly this many (at least 2).</p>
        </div>
        <div>
          <label htmlFor="fixed_price" className={labelClass}>Fixed set price</label>
          <div className={wrapClass}>
            <span className="select-none border-r border-gold-400/10 px-3.5 py-3 text-sm text-gold-300/80">₹</span>
            <input
              id="fixed_price"
              type="number"
              inputMode="numeric"
              name="fixed_price"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 799"
              className="w-full bg-transparent px-3.5 py-3 text-sm text-ivory placeholder:text-ivory/30 focus:outline-none"
            />
          </div>
          <p className="mt-1.5 text-[13px] font-medium text-ivory/50">Leave empty to charge the normal prices.</p>
        </div>
      </div>

      <div className="rounded-xl border border-gold-400/15 bg-gold-400/5 px-4 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-300/90">What customers see</p>
        <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-ivory/80">{preview}</p>
      </div>

      <div>
        <label htmlFor="bundle_title" className={labelClass}>Page title</label>
        <input id="bundle_title" type="text" name="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label htmlFor="bundle_subtitle" className={labelClass}>Subtitle</label>
        <input id="bundle_subtitle" type="text" name="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputClass} />
      </div>

      <div>
        <span className={labelClass}>Banner image <span className="font-normal normal-case tracking-normal text-ivory/40">(optional)</span></span>
        <ImageUploader value={image || null} onChange={(u) => setImage(u || "")} folder="amairah/bundle" previewClassName="aspect-video w-full max-w-md" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-400/10 pt-5">
        <div className="min-w-0 text-sm font-medium">
          {state.error ? (
            <span className="flex items-center gap-2 text-red-300"><AlertCircle className="h-4 w-4 shrink-0" /> {state.error}</span>
          ) : state.success && !dirty ? (
            <span className="flex items-center gap-2 text-green-300"><Check className="h-4 w-4 shrink-0" /> Bundle settings saved.</span>
          ) : dirty ? (
            <span className="flex items-center gap-2 text-amber-200"><span className="h-2 w-2 rounded-full bg-amber-300" /> You have unsaved changes</span>
          ) : (
            <span className="text-ivory/40">All changes saved</span>
          )}
        </div>
        <button type="submit" disabled={pending || !dirty} className="btn-gold px-8 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
