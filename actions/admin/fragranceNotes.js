"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/adminAuth";
import { normalizeNoteName, splitNotes, findNoteMatchKey } from "@/lib/fragranceNotes";

const UNAUTHORIZED = { success: false, error: "Not authorized." };
// Images must come from our own Cloudinary account (uploaded via the signed widget).
const IMAGE_URL_PREFIX = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ""}/`;
const MAX_BULK = 50;

function validate({ name, image_url }) {
  const cleanName = String(name || "").trim().replace(/\s+/g, " ");
  if (!cleanName) return { error: "Ingredient name is required." };
  if (cleanName.length > 60) return { error: "Name must be 60 characters or fewer." };
  if (image_url) {
    if (typeof image_url !== "string" || image_url.length > 500 || !image_url.startsWith(IMAGE_URL_PREFIX)) {
      return { error: "Image must be uploaded through the uploader." };
    }
  }
  return { name: cleanName, image_url: image_url || null };
}

function refresh() {
  revalidatePath("/admin/fragrance-notes");
  revalidatePath("/shop", "layout");
}

// Names that are really a sentence / leftover text pasted into a product's notes
// ("and Laotian oud", "These are the notes listed for…"). They are not offered as
// ingredients; the admin is pointed at the products to fix instead.
function looksBroken(name) {
  return (
    name.length > 32 ||
    /^(and|or|with)\s/i.test(name) ||
    /[.;:]$/.test(name) ||
    /\bnotes?\b.*\b(listed|are|for)\b/i.test(name) ||
    name.split(" ").length > 5
  );
}

// Library + usage counts + names worth adding + notes that need fixing.
export async function getFragranceNotesAdmin() {
  const empty = { notes: [], missing: [], flagged: [] };
  if (!(await isAdminRequest())) return empty;
  try {
    const supabase = createAdminClient();
    const [{ data: notes }, { data: products }] = await Promise.all([
      supabase.from("fragrance_notes").select("id, name, name_key, image_url").order("name", { ascending: true }),
      supabase.from("products").select("id, name, notes_top, notes_middle, notes_base"),
    ]);

    // normalised name -> { name, products: Map(id -> name) }
    const usage = new Map();
    for (const p of products || []) {
      for (const field of [p.notes_top, p.notes_middle, p.notes_base]) {
        for (const ingredient of splitNotes(field)) {
          const key = normalizeNoteName(ingredient);
          if (!usage.has(key)) usage.set(key, { name: ingredient, products: new Map() });
          usage.get(key).products.set(p.id, p.name);
        }
      }
    }

    const known = new Set((notes || []).map((n) => n.name_key));
    const has = (k) => known.has(k);

    // How many products each library entry covers (exact names AND variants such as
    // "Italian Bergamot" -> "Bergamot"), and which used names are already covered.
    const covered = new Map(); // library key -> Set(product ids)
    for (const [key, u] of usage) {
      const m = findNoteMatchKey(u.name, has);
      if (!m) continue;
      if (!covered.has(m)) covered.set(m, new Set());
      for (const id of u.products.keys()) covered.get(m).add(id);
    }
    const withUsage = (notes || []).map((n) => ({ ...n, usedIn: covered.get(n.name_key)?.size || 0 }));

    const missing = [];
    const flagged = [];
    for (const [key, u] of usage) {
      if (findNoteMatchKey(u.name, has)) continue; // already shows an image
      if (looksBroken(u.name)) {
        flagged.push({
          name: u.name,
          products: [...u.products].slice(0, 5).map(([id, name]) => ({ id, name })),
        });
      } else {
        missing.push({ name: u.name, count: u.products.size });
      }
    }
    missing.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    flagged.sort((a, b) => a.name.localeCompare(b.name));

    return { notes: withUsage, missing, flagged };
  } catch {
    return empty;
  }
}

// Names offered as suggestions in the product form: the Fragrance Notes library
// first (with images), then names already used on other products.
export async function getNoteSuggestions() {
  const { notes, missing } = await getFragranceNotesAdmin();
  return [
    ...notes.map((n) => ({ name: n.name, image: n.image_url || null, inLibrary: true })),
    ...missing.map((m) => ({ name: m.name, image: null, inLibrary: false })),
  ];
}

export async function createFragranceNote(input) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  const v = validate(input || {});
  if (v.error) return { success: false, error: v.error };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fragrance_notes")
      .insert({ name: v.name, name_key: normalizeNoteName(v.name), image_url: v.image_url })
      .select("id, name, name_key, image_url")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "This ingredient already exists." };
      return { success: false, error: "Could not save the ingredient." };
    }
    refresh();
    return { success: true, note: data };
  } catch {
    return { success: false, error: "Could not save the ingredient." };
  }
}

// Bulk save: items = [{ name, image_url }]. A name that already exists just gets
// the new image; new names are created. Returns per-row problems instead of failing all.
export async function saveFragranceNotesBulk(items) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (!Array.isArray(items) || items.length === 0) return { success: false, error: "Nothing to save." };
  if (items.length > MAX_BULK) return { success: false, error: `Save at most ${MAX_BULK} images at a time.` };

  const supabase = createAdminClient();
  let created = 0;
  let updated = 0;
  const problems = [];
  const seen = new Set();

  for (const item of items) {
    const v = validate(item || {});
    if (v.error) { problems.push(`${String(item?.name || "(blank)").slice(0, 40)}: ${v.error}`); continue; }
    const key = normalizeNoteName(v.name);
    if (seen.has(key)) { problems.push(`${v.name}: listed twice`); continue; }
    seen.add(key);
    try {
      const { data: existing } = await supabase.from("fragrance_notes").select("id").eq("name_key", key).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("fragrance_notes").update({ image_url: v.image_url }).eq("id", existing.id);
        if (error) problems.push(`${v.name}: could not update`); else updated++;
      } else {
        const { error } = await supabase.from("fragrance_notes").insert({ name: v.name, name_key: key, image_url: v.image_url });
        if (error) problems.push(`${v.name}: could not save`); else created++;
      }
    } catch {
      problems.push(`${v.name}: could not save`);
    }
  }

  if (created + updated > 0) refresh();
  return { success: created + updated > 0, created, updated, problems };
}

export async function updateFragranceNote(id, input) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (!id || typeof id !== "string") return { success: false, error: "Invalid ingredient." };
  const v = validate(input || {});
  if (v.error) return { success: false, error: v.error };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fragrance_notes")
      .update({ name: v.name, name_key: normalizeNoteName(v.name), image_url: v.image_url })
      .eq("id", id)
      .select("id, name, name_key, image_url")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "Another ingredient already has this name." };
      return { success: false, error: "Could not save the ingredient." };
    }
    refresh();
    return { success: true, note: data };
  } catch {
    return { success: false, error: "Could not save the ingredient." };
  }
}

export async function deleteFragranceNote(id) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (!id || typeof id !== "string") return { success: false, error: "Invalid ingredient." };
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("fragrance_notes").delete().eq("id", id);
    if (error) return { success: false, error: "Could not delete the ingredient." };
    refresh();
    return { success: true };
  } catch {
    return { success: false, error: "Could not delete the ingredient." };
  }
}
