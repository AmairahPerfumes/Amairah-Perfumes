// Validation + URL helpers for manual courier shipments. Pure functions (no
// server-only imports) so they can be unit-checked and reused.

const TRACKING_ID_RE = /^[A-Za-z0-9][A-Za-z0-9\-_/ ]{2,39}$/;

export function cleanTrackingId(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function isValidTrackingId(value) {
  return TRACKING_ID_RE.test(value);
}

// Only plain http(s) links — this URL is shown to customers as a clickable
// link, so anything else (javascript:, data:, …) must never get through.
export function cleanHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return { url: null };
  if (raw.length > 500) return { error: "Tracking link is too long." };
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad protocol");
    return { url: u.toString() };
  } catch {
    return { error: "Tracking link must be a valid http(s) URL." };
  }
}

// "{tracking_id}" in a courier's template becomes the (URL-encoded) tracking ID.
export function buildTrackingUrl(template, trackingId) {
  const t = String(template || "").trim();
  if (!t) return null;
  const url = t.replaceAll("{tracking_id}", encodeURIComponent(trackingId));
  return cleanHttpUrl(url).url || null;
}
