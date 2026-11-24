"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { normalizeNoteName } from "@/lib/fragranceNotes";

// Comma-separated ingredient field with suggestions. While typing the last
// ingredient (the text after the final comma) it offers matching names from the
// Fragrance Notes library first, then names already used on other products,
// so the same ingredient is always spelled the same way.
//   suggestions: [{ name, image, inLibrary }]
export default function NotesInput({ name, defaultValue = "", placeholder, className, suggestions = [] }) {
  const [value, setValue] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const lastComma = value.lastIndexOf(",");
  const token = value.slice(lastComma + 1).trim();

  const matches = useMemo(() => {
    if (!token) return [];
    const already = new Set(value.slice(0, lastComma + 1).split(",").map(normalizeNoteName).filter(Boolean));
    const needle = normalizeNoteName(token);
    return suggestions
      .filter((s) => !already.has(normalizeNoteName(s.name)) && normalizeNoteName(s.name).includes(needle))
      // prefix matches first, then the rest (library entries already come first)
      .sort((a, b) => {
        const ap = normalizeNoteName(a.name).startsWith(needle) ? 0 : 1;
        const bp = normalizeNoteName(b.name).startsWith(needle) ? 0 : 1;
        return ap - bp;
      })
      .slice(0, 8);
  }, [token, value, lastComma, suggestions]);

  const show = open && matches.length > 0;

  const pick = (s) => {
    const before = value.slice(0, lastComma + 1);
    const next = `${before}${before ? " " : ""}${s.name}, `;
    setValue(next);
    setActive(0);
    // keep typing the next ingredient
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (e) => {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      // Enter must not submit the whole product form while a suggestion is open.
      if (e.key === "Enter") e.preventDefault();
      pick(matches[active] || matches[0]);
      if (e.key === "Tab") e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {show && (
        <ul className="absolute left-0 right-0 z-30 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-gold-400/20 bg-[#120f0d] p-1.5 shadow-2xl">
          {matches.map((s, i) => (
            <li key={s.name}>
              {/* onMouseDown (not onClick) so it fires before the input's blur closes the list */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  i === active ? "bg-gold-400/15 text-gold-100" : "text-ivory/80 hover:bg-gold-400/10"
                }`}
              >
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold-400/20 bg-ink">
                  {s.image ? (
                    <Image src={s.image} alt="" fill sizes="24px" className="object-cover" />
                  ) : (
                    <span className="h-1.5 w-1.5 rotate-45 bg-gold-400/60" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                {s.inLibrary && (
                  <span className="shrink-0 rounded-full border border-gold-400/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold-300">
                    Library
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
