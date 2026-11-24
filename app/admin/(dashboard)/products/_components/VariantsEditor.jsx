"use client";

import { Plus, Trash2 } from "lucide-react";
import FilterSelect from "@/components/admin/FilterSelect";

const inputClass = "w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold-400/50 focus:outline-none";
const errorInputClass = "border-red-500/60 focus:border-red-500/60";
const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ivory/45";

function Field({ label, error, children }) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export default function VariantsEditor({ variants, onChange, showErrors }) {
  const update = (idx, key, value) => {
    onChange(variants.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  };

  const add = () => {
    onChange([...variants, { variant_name: "", bottle_type: "glass", price: "", original_price: "", stock_quantity: "", weight_grams: "" }]);
  };

  const remove = (idx) => onChange(variants.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {variants.map((v, i) => {
        const nameMissing = showErrors && !v.variant_name?.trim();
        const priceMissing = showErrors && (v.price === "" || v.price == null || Number(v.price) <= 0);
        const stockMissing = showErrors && (v.stock_quantity === "" || v.stock_quantity == null || Number(v.stock_quantity) < 0);

        return (
          <div key={i} className="rounded-xl border border-ink-line p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gold-300/80">
                Size {i + 1}
                {v.variant_name ? ` · ${v.variant_name}` : ""}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove size ${i + 1}`}
                className="flex items-center justify-center rounded-lg p-1.5 text-ivory/40 hover:bg-ink hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Size" error={nameMissing && "Size name required"}>
                <input
                  placeholder="e.g. 30ml"
                  value={v.variant_name}
                  onChange={(e) => update(i, "variant_name", e.target.value)}
                  className={`${inputClass} ${nameMissing ? errorInputClass : ""}`}
                />
              </Field>
              <Field label="Bottle">
                <FilterSelect
                  value={v.bottle_type === "plastic" ? "plastic" : "glass"}
                  onChange={(e) => update(i, "bottle_type", e.target.value)}
                  buttonClassName="rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-ivory hover:border-gold-400/30"
                  options={[
                    { value: "glass", label: "Glass" },
                    { value: "plastic", label: "Plastic" },
                  ]}
                />
              </Field>
              <Field label="Price (₹)" error={priceMissing && "Valid price required"}>
                <input
                  type="number"
                  placeholder="e.g. 499"
                  value={v.price}
                  onChange={(e) => update(i, "price", e.target.value)}
                  className={`${inputClass} ${priceMissing ? errorInputClass : ""}`}
                />
              </Field>
              <Field label="Old price (₹)">
                <input
                  type="number"
                  placeholder="Optional"
                  value={v.original_price}
                  onChange={(e) => update(i, "original_price", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Stock" error={stockMissing && "Stock required"}>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={v.stock_quantity}
                  onChange={(e) => update(i, "stock_quantity", e.target.value)}
                  className={`${inputClass} ${stockMissing ? errorInputClass : ""}`}
                />
              </Field>
              <Field label="Weight (g)">
                <input
                  type="number"
                  placeholder="Optional"
                  value={v.weight_grams ?? ""}
                  onChange={(e) => update(i, "weight_grams", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-gold-300 hover:text-gold-200"
      >
        <Plus className="h-4 w-4" /> Add Bottle Size
      </button>
      <p className="text-[11px] text-ivory/40">
        To offer both Glass and Plastic for the same size, add two rows with the same size name — one Glass, one Plastic (with a lower price). Glass is shown as the default on the product page. Weight (grams) is used for courier shipment booking — leave blank to use a default estimate.
      </p>
    </div>
  );
}
