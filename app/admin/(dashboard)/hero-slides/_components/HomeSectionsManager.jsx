"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, AlertCircle, ArrowRight, Sparkles, Compass, Route, Gem, Quote, HelpCircle } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import Switch from "@/components/admin/Switch";
import { updateSiteSetting } from "@/actions/settings";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-3 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";
const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-6 backdrop-blur-md md:p-8";

const SECTIONS = [
  {
    id: "marquee",
    title: "Marquee Strip",
    sub: "The scrolling line of highlights on the homepage.",
    icon: Sparkles,
    enabledKey: "home_marquee_enabled",
    fields: [
      {
        key: "home_marquee_items",
        label: "Items",
        hint: "One item per line. Start a line with * to highlight it in gold.",
        rows: 8,
        wide: true,
      },
    ],
  },
  {
    id: "choose",
    title: "Find the Perfect Scent",
    sub: "Three occasion cards and a consultation card.",
    icon: Compass,
    enabledKey: "home_choose_enabled",
    fields: [
      { key: "home_choose_subtitle", label: "Subtitle", wide: true },
      { key: "home_choose_option1_title", label: "Option 1 — Title" },
      { key: "home_choose_option1_desc", label: "Option 1 — Description" },
      { key: "home_choose_option2_title", label: "Option 2 — Title" },
      { key: "home_choose_option2_desc", label: "Option 2 — Description" },
      { key: "home_choose_option3_title", label: "Option 3 — Title" },
      { key: "home_choose_option3_desc", label: "Option 3 — Description" },
      { key: "home_choose_unsure_title", label: "Consultation card — Heading" },
      { key: "home_choose_unsure_text", label: "Consultation card — Text" },
      { key: "home_choose_unsure_button", label: "Consultation card — Button text" },
    ],
    imageKey: "home_choose_image",
  },
  {
    id: "journey",
    title: "The Fragrance Journey",
    sub: "Three lines that tell how a fragrance unfolds, with an image.",
    icon: Route,
    enabledKey: "home_journey_enabled",
    fields: [
      { key: "home_journey_line1", label: "Line 1" },
      { key: "home_journey_label1", label: "Line 1 — Label" },
      { key: "home_journey_line2", label: "Line 2" },
      { key: "home_journey_label2", label: "Line 2 — Label" },
      { key: "home_journey_line3", label: "Line 3" },
      { key: "home_journey_label3", label: "Line 3 — Label" },
    ],
    imageKey: "home_journey_image",
  },
  {
    id: "limited",
    title: "Limited Edition",
    sub: "The banner that promotes your limited editions.",
    icon: Gem,
    enabledKey: "home_limited_enabled",
    fields: [
      { key: "home_limited_heading_line1", label: "Heading — Line 1" },
      { key: "home_limited_heading_line2", label: "Heading — Line 2 (gold)" },
      { key: "home_limited_subtitle", label: "Subtitle", wide: true },
      { key: "home_limited_button_text", label: "Button text" },
    ],
    imageKey: "home_limited_image",
  },
  {
    id: "testimonials",
    title: "What Our Customers Say",
    sub: "The heading text above the customer reviews carousel.",
    icon: Quote,
    enabledKey: "home_testimonials_enabled",
    fields: [{ key: "home_testimonials_subtitle", label: "Subtitle", wide: true }],
    note: "The actual customer reviews are managed on the Testimonials page.",
    noteHref: "/admin/testimonials",
  },
  {
    id: "faq",
    title: "Questions You Might Have",
    sub: "Four questions and answers on the homepage, with an image.",
    icon: HelpCircle,
    enabledKey: "home_faq_enabled",
    fields: [
      { key: "home_faq_subtitle", label: "Subtitle", wide: true },
      { key: "home_faq_q1", label: "Question 1", wide: true },
      { key: "home_faq_a1", label: "Answer 1", wide: true },
      { key: "home_faq_q2", label: "Question 2", wide: true },
      { key: "home_faq_a2", label: "Answer 2", wide: true },
      { key: "home_faq_q3", label: "Question 3", wide: true },
      { key: "home_faq_a3", label: "Answer 3", wide: true },
      { key: "home_faq_q4", label: "Question 4", wide: true },
      { key: "home_faq_a4", label: "Answer 4", wide: true },
    ],
    imageKey: "home_faq_image",
  },
];

function keysOf(section) {
  return [
    ...section.fields.map((f) => f.key),
    ...(section.imageKey ? [section.imageKey] : []),
    ...(section.enabledKey ? [section.enabledKey] : []),
  ];
}

export default function HomeSectionsManager({ settings, only, onSaved }) {
  const sections = only ? SECTIONS.filter((s) => only.includes(s.id)) : SECTIONS;

  const initial = {};
  sections.forEach((section) => {
    section.fields.forEach((f) => (initial[f.key] = settings[f.key]?.value ?? ""));
    if (section.imageKey) initial[section.imageKey] = settings[section.imageKey]?.value ?? "";
    if (section.enabledKey) initial[section.enabledKey] = settings[section.enabledKey]?.value ?? "true";
  });

  const [values, setValues] = useState(initial);
  const [base, setBase] = useState(initial); // last saved
  const [savingId, setSavingId] = useState(null);
  const [saved, setSaved] = useState(null);

  const handleChange = (key, value) => {
    setSaved(null);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (section) => {
    const changed = keysOf(section).filter((k) => values[k] !== base[k]);
    setSaved(null);
    setSavingId(section.id);
    try {
      const results = await Promise.all(changed.map((key) => updateSiteSetting(key, values[key])));
      const failed = results.find((r) => !r.success);
      if (failed) {
        setSaved({ id: section.id, success: false, error: failed.error || "Could not save." });
      } else {
        setBase((prev) => ({ ...prev, ...Object.fromEntries(changed.map((k) => [k, values[k]])) }));
        setSaved({ id: section.id, success: true });
        onSaved?.(Object.fromEntries(changed.map((k) => [k, values[k]])));
      }
    } catch {
      setSaved({ id: section.id, success: false, error: "Something went wrong. Please try again." });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const dirtyCount = keysOf(section).filter((k) => values[k] !== base[k]).length;
        const isSaving = savingId === section.id;
        const enabled = section.enabledKey ? values[section.enabledKey] !== "false" : true;

        return (
          <section key={section.id} className={panelClass}>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
                  <section.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-ivory">{section.title}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-ivory/65">{section.sub}</p>
                </div>
              </div>
              {section.enabledKey && (
                <div className="flex items-center gap-3 rounded-full border border-gold-400/10 bg-white/[0.02] py-1.5 pl-4 pr-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${enabled ? "text-green-300" : "text-ivory/45"}`}>
                    {enabled ? "Shown on homepage" : "Hidden"}
                  </span>
                  <Switch size="sm" checked={enabled} onChange={() => handleChange(section.enabledKey, enabled ? "false" : "true")} label="Show on homepage" />
                </div>
              )}
            </div>

            <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${enabled ? "" : "opacity-60"}`}>
              {section.fields.map((field) => {
                const long = field.rows || (values[field.key]?.length ?? 0) > 70 || /Description|Text|Answer|Subtitle/.test(field.label);
                const wide = field.wide || field.rows;
                return (
                  <div key={field.key} className={wide ? "md:col-span-2" : ""}>
                    <label htmlFor={field.key} className={labelClass}>{field.label}</label>
                    {long ? (
                      <textarea
                        id={field.key}
                        value={values[field.key]}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        rows={field.rows ?? ((values[field.key]?.length ?? 0) > 140 ? 4 : 3)}
                        className={`${inputClass} resize-y`}
                      />
                    ) : (
                      <input id={field.key} value={values[field.key]} onChange={(e) => handleChange(field.key, e.target.value)} className={inputClass} />
                    )}
                    {field.hint && <p className="mt-1.5 text-[13px] font-medium text-ivory/50">{field.hint}</p>}
                  </div>
                );
              })}

              {section.imageKey && (
                <div className="md:col-span-2">
                  <span className={labelClass}>Image</span>
                  <ImageUploader
                    value={values[section.imageKey]}
                    onChange={(url) => handleChange(section.imageKey, url || "")}
                    folder="amairah/home-sections"
                    previewClassName="h-32 w-48"
                  />
                </div>
              )}

              {section.note && (
                <div className="md:col-span-2">
                  <Link href={section.noteHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200">
                    {section.note} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-gold-400/10 pt-5">
              <div className="min-w-0 text-sm font-medium">
                {saved?.id === section.id && !saved.success ? (
                  <span className="flex items-center gap-2 text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {saved.error}
                  </span>
                ) : saved?.id === section.id && saved.success && dirtyCount === 0 ? (
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
                onClick={() => handleSave(section)}
                disabled={isSaving || dirtyCount === 0}
                className="btn-gold w-full px-8 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
