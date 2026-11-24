"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

// Themed dropdown for the admin — same look as the storefront's sort dropdown
// (gold-bordered rounded panel, gold check on the active row) instead of the
// browser's native <select> popup, which can't be styled.
//
// Drop-in for <select>: `value` / `defaultValue`, `onChange` (receives an
// event-like `{ target: { value, name } }`), `options: [{ value, label }]`.
// Pass `name` to submit the value with a native <form> (renders a hidden input).
// `buttonClassName` replaces the default closed-control look; `labelClassName`
// styles the selected label (e.g. a status colour).
const DEFAULT_BUTTON =
  "rounded-xl border border-gold-400/10 bg-ink-soft/40 py-2 pl-3 pr-3 text-sm text-ivory hover:border-gold-400/20";

export default function FilterSelect({
  value,
  defaultValue,
  onChange,
  options,
  className = "",
  buttonClassName = DEFAULT_BUTTON,
  labelClassName = "",
  name,
  id,
  disabled = false,
  placeholder = "Select",
  "aria-label": ariaLabel,
}) {
  const autoId = useId();
  const controlId = id || autoId;
  const isControlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = String(isControlled ? value ?? "" : inner);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const selected = options.find((o) => String(o.value) === current);
  const selectedIndex = options.findIndex((o) => String(o.value) === current);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuH = Math.min(options.length * 44 + 12, 280);
    const spaceBelow = window.innerHeight - r.bottom;
    const flip = spaceBelow < menuH + 12 && r.top > spaceBelow;
    setPos({
      left: r.left,
      width: r.width,
      ...(flip ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open || active < 0) return;
    menuRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (opt) => {
    const v = String(opt.value);
    if (!isControlled) setInner(v);
    onChange?.({ target: { value: v, name } });
    setOpen(false);
    btnRef.current?.focus();
  };

  const openMenu = () => {
    if (disabled) return;
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const onButtonKey = (e) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        ref={btnRef}
        id={controlId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onButtonKey}
        className={`flex w-full items-center justify-between gap-3 text-left transition-colors duration-300 focus:outline-none focus-visible:border-gold-400/40 disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "!border-gold-300/50" : ""
        } ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? labelClassName : "text-ivory/40"}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gold-300 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, minWidth: 160 }}
            className="z-[200] max-h-72 overflow-y-auto rounded-2xl border border-gold-400/15 bg-gradient-to-b from-ink-soft to-ink-soft py-1.5 shadow-2xl shadow-black/60 animate-fadeUp"
          >
            {options.map((opt, i) => {
              const isActive = String(opt.value) === current;
              return (
                <button
                  key={String(opt.value)}
                  data-idx={i}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(opt)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    isActive ? "bg-gold-400/15 text-gold-200" : i === active ? "bg-ink/70 text-ivory" : "text-ivory/75"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-gold-300" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
