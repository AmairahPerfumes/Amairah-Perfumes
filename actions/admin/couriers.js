"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/adminAuth";
import { cleanHttpUrl } from "@/lib/shipmentValidation";

const UNAUTHORIZED = { success: false, error: "Not authorized." };

function normalizeKey(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function validate({ name, tracking_url_template }) {
  const cleanName = String(name || "").trim().replace(/\s+/g, " ");
  if (!cleanName) return { error: "Courier name is required." };
  if (cleanName.length > 60) return { error: "Name must be 60 characters or fewer." };

  const template = String(tracking_url_template || "").trim();
  if (template) {
    // Validate with a sample ID so "{tracking_id}" templates are checked too.
    const check = cleanHttpUrl(template.replaceAll("{tracking_id}", "TEST123"));
    if (check.error) return { error: check.error };
  }
  return { name: cleanName, tracking_url_template: template || null };
}

function refresh() {
  revalidatePath("/admin/settings/couriers");
  revalidatePath("/admin/orders", "layout");
}

export async function getCouriersAdmin() {
  if (!(await isAdminRequest())) return [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("courier_partners")
      .select("id, name, tracking_url_template, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    return data || [];
  } catch {
    return [];
  }
}

export async function createCourier(input) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  const v = validate(input || {});
  if (v.error) return { success: false, error: v.error };

  try {
    const supabase = createAdminClient();
    const { data: last } = await supabase
      .from("courier_partners")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    const { data, error } = await supabase
      .from("courier_partners")
      .insert({
        name: v.name,
        name_key: normalizeKey(v.name),
        tracking_url_template: v.tracking_url_template,
        sort_order: (last?.[0]?.sort_order ?? -1) + 1,
      })
      .select("id, name, tracking_url_template, is_active, sort_order")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "This courier already exists." };
      return { success: false, error: "Could not save the courier." };
    }
    refresh();
    return { success: true, courier: data };
  } catch {
    return { success: false, error: "Could not save the courier." };
  }
}

export async function updateCourier(id, input) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (!id || typeof id !== "string") return { success: false, error: "Invalid courier." };
  const v = validate(input || {});
  if (v.error) return { success: false, error: v.error };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("courier_partners")
      .update({ name: v.name, name_key: normalizeKey(v.name), tracking_url_template: v.tracking_url_template })
      .eq("id", id)
      .select("id, name, tracking_url_template, is_active, sort_order")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "Another courier already has this name." };
      return { success: false, error: "Could not save the courier." };
    }
    refresh();
    return { success: true, courier: data };
  } catch {
    return { success: false, error: "Could not save the courier." };
  }
}

export async function toggleCourier(id, isActive) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (!id || typeof id !== "string") return { success: false, error: "Invalid courier." };
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("courier_partners").update({ is_active: Boolean(isActive) }).eq("id", id);
    if (error) return { success: false, error: "Could not update the courier." };
    refresh();
    return { success: true };
  } catch {
    return { success: false, error: "Could not update the courier." };
  }
}

export async function deleteCourier(id) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (!id || typeof id !== "string") return { success: false, error: "Invalid courier." };
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("courier_partners").delete().eq("id", id);
    if (error) return { success: false, error: "Could not delete the courier." };
    refresh();
    return { success: true };
  } catch {
    return { success: false, error: "Could not delete the courier." };
  }
}
