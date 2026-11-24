"use client";

import { useState } from "react";
import { GalleryHorizontal, Sparkles, Compass, Route, Gem, Quote, HelpCircle } from "lucide-react";
import HeroSlideManager from "./HeroSlideManager";
import HomeSectionsManager from "./HomeSectionsManager";

const TABS = [
  { id: "hero", label: "Hero", icon: GalleryHorizontal, enabledKey: "home_hero_enabled" },
  { id: "marquee", label: "Marquee Strip", icon: Sparkles, sections: ["marquee"], enabledKey: "home_marquee_enabled" },
  { id: "choose", label: "Find the Perfect Scent", icon: Compass, sections: ["choose"], enabledKey: "home_choose_enabled" },
  { id: "journey", label: "Fragrance Journey", icon: Route, sections: ["journey"], enabledKey: "home_journey_enabled" },
  { id: "limited", label: "Limited Edition", icon: Gem, sections: ["limited"], enabledKey: "home_limited_enabled" },
  { id: "testimonials", label: "Testimonials", icon: Quote, sections: ["testimonials"], enabledKey: "home_testimonials_enabled" },
  { id: "faq", label: "FAQ", icon: HelpCircle, sections: ["faq"], enabledKey: "home_faq_enabled" },
];

export default function HomeCustomizationTabs({ slides, settings }) {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const activeTab = TABS.find((t) => t.id === activeId);

  // whether each section is shown on the homepage — drives the little dot on each tab
  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(TABS.map((t) => [t.enabledKey, (settings[t.enabledKey]?.value ?? "true") !== "false"]))
  );
  // Keep our own copy of the saved settings, so switching tabs and coming back
  // shows what was just saved (each tab is re-created when you switch to it).
  const [settingsState, setSettingsState] = useState(settings);
  const onSaved = (changed) => {
    setSettingsState((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(changed)) next[k] = { ...(prev[k] || {}), value: v };
      return next;
    });
    const patch = {};
    for (const [k, v] of Object.entries(changed)) if (k.endsWith("_enabled")) patch[k] = v !== "false";
    if (Object.keys(patch).length) setEnabled((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div>
      <div className="mb-6 -mx-4 flex gap-2 overflow-x-auto border-b border-gold-400/10 px-4 pb-4 scrollbar-thin scrollbar-thumb-gold-400/10 scrollbar-track-transparent sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {TABS.map((tab) => {
          const active = tab.id === activeId;
          const on = enabled[tab.enabledKey];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveId(tab.id)}
              className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                active
                  ? "border-gold-400/35 bg-gold-400/10 text-gold-100"
                  : "border-gold-400/10 bg-white/[0.02] text-ivory/60 hover:border-gold-400/20 hover:text-ivory"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span
                title={on ? "Shown on the homepage" : "Hidden on the homepage"}
                className={`h-2 w-2 rounded-full ${on ? "bg-green-400" : "bg-ivory/25"}`}
              />
            </button>
          );
        })}
      </div>
      <p className="-mt-2 mb-6 flex items-center gap-2 text-[13px] font-medium text-ivory/45">
        <span className="h-2 w-2 rounded-full bg-green-400" /> shown on the homepage
        <span className="ml-3 h-2 w-2 rounded-full bg-ivory/25" /> hidden
      </p>

      {/* The hero tab stays mounted (just hidden) so slides you added or edited are still there when you come back. */}
      <div className={activeTab.id === "hero" ? "" : "hidden"}>
        <HeroSlideManager slides={slides} settings={settings} onSaved={onSaved} />
      </div>
      {activeTab.id !== "hero" && (
        <HomeSectionsManager key={activeTab.id} settings={settingsState} only={activeTab.sections} onSaved={onSaved} />
      )}
    </div>
  );
}
