// Shared helpers for the fragrance-notes ingredient library.
// Notes on a product are free text ("Bergamot, Lavender; Red Berries"), and the
// admin-managed library maps an ingredient name to an image. Both sides go
// through normalizeNoteName so "red  berries" and "Red Berries" match.

export function normalizeNoteName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Which library entry (by normalised name) should an ingredient use for its image?
//   1. exact name            "bergamot"          -> "bergamot"
//   2. ignoring a trailing "accord"/"notes"      "amber accord"      -> "amber"
//   3. the ending of the name (variants)         "italian bergamot"  -> "bergamot"
//                                                "sicilian lemon"    -> "lemon"
//                                                "frozen apple"      -> "apple"
// Only the END of the name is tried, so "orange blossom" does NOT borrow "orange".
// `has(key)` says whether the library has an entry with that normalised name.
export function findNoteMatchKey(name, has) {
  const key = normalizeNoteName(name);
  if (!key) return null;
  if (has(key)) return key;
  const stripped = key.replace(/\s+(accord|notes?)$/, "");
  const words = stripped.split(" ");
  for (let i = 0; i < words.length; i++) {
    const candidate = words.slice(i).join(" ");
    if (candidate !== key && has(candidate)) return candidate;
  }
  return null;
}

// "Bergamot, Lavender; Red Berries" -> ["Bergamot", "Lavender", "Red Berries"]
export function splitNotes(value) {
  return String(value || "")
    .split(/[,;|\n]/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}
