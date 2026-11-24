// Pre-order settings from the admin product form. Returns an error string, or
// null when fine. `advance` must be a whole-rupee amount once pre-order (or
// "pre-order when out of stock") is switched on.
export function validatePreorder({ enabled, allowOos, advance, dispatchDate }) {
  const amount = Number(advance);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return "Enter a valid pre-order advance amount.";
  if ((enabled || allowOos) && Math.round(amount) < 1) {
    return "Enter the advance amount (₹) customers pay to pre-order.";
  }
  if (dispatchDate && !/^\d{4}-\d{2}-\d{2}$/.test(dispatchDate)) return "Enter a valid expected dispatch date.";
  return null;
}

// Shared between the admin product form (client-side, instant feedback) and
// the create/update server actions (last line of defense against bad data).
export function validateVariants(variants) {
  if (!variants || variants.length === 0) return "Add at least one bottle size.";

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const label = v.variant_name && String(v.variant_name).trim() ? `"${v.variant_name}"` : `Bottle size #${i + 1}`;

    if (!v.variant_name || !String(v.variant_name).trim()) {
      return `${label}: please enter a size name (e.g. 30ml).`;
    }
    if (v.price === "" || v.price == null || Number.isNaN(Number(v.price)) || Number(v.price) <= 0) {
      return `${label}: please enter a valid price.`;
    }
    if (v.stock_quantity === "" || v.stock_quantity == null || Number.isNaN(Number(v.stock_quantity)) || Number(v.stock_quantity) < 0) {
      return `${label}: please enter a stock quantity.`;
    }
  }

  // Same size can appear twice if it's a Glass/Plastic pair — only an exact
  // size + bottle type combo needs to be unique.
  const keys = variants.map(
    (v) => `${String(v.variant_name).trim().toLowerCase()}::${v.bottle_type === "plastic" ? "plastic" : "glass"}`
  );
  const dupeIdx = keys.findIndex((k, i) => keys.indexOf(k) !== i);
  if (dupeIdx !== -1) {
    const v = variants[dupeIdx];
    const bottleLabel = v.bottle_type === "plastic" ? "Plastic" : "Glass";
    return `Duplicate "${v.variant_name}" (${bottleLabel}) — each size + bottle type combo must be unique.`;
  }

  return null;
}
