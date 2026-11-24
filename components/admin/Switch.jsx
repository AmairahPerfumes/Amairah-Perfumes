"use client";

// Small on/off switch used across the admin (replaces plain checkboxes).
export default function Switch({ checked, onChange, disabled, label, size = "md" }) {
  const sm = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${sm ? "h-6 w-11" : "h-7 w-12"} ${checked ? "bg-green-500" : "bg-ivory/15"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 rounded-full bg-white shadow transition-transform duration-300 ${sm ? "h-5 w-5" : "h-6 w-6"} ${
          checked ? (sm ? "translate-x-5" : "translate-x-5") : "translate-x-0"
        }`}
      />
    </button>
  );
}
