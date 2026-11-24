"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";

const COUPON_FIELDS = "id, code, type, value, min_purchase, is_active, expires_at, created_at";

export async function getAllCoupons() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase.from("coupons").select(COUPON_FIELDS).order("created_at", { ascending: false });
  return data || [];
}

export async function createCoupon(_prevState, formData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const type = formData.get("type") === "flat" ? "flat" : "percent";
  const value = Number(formData.get("value"));
  const minPurchase = Number(formData.get("min_purchase") || 0);
  const expiresRaw = String(formData.get("expires_at") || "").trim();

  if (!code || !value) return { error: "Code and value are required." };
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
    return { error: "Code must be 3–24 characters: letters, numbers, - or _ (no spaces)." };
  }
  if (!Number.isFinite(value) || value <= 0) return { error: "Value must be more than 0." };
  if (type === "percent" && value > 100) return { error: "A percent coupon can't be more than 100%." };
  if (type === "flat" && value > 100000) return { error: "That flat amount looks too high." };
  if (!Number.isFinite(minPurchase) || minPurchase < 0 || minPurchase > 1000000) return { error: "Enter a valid minimum purchase." };

  let expires_at = null;
  if (expiresRaw) {
    const d = new Date(expiresRaw);
    if (Number.isNaN(d.getTime())) return { error: "Enter a valid expiry date." };
    expires_at = expiresRaw;
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert({ code, type, value, min_purchase: minPurchase, expires_at, is_active: true })
    .select(COUPON_FIELDS)
    .single();

  if (error) {
    return { error: error.code === "23505" || error.message.includes("duplicate") ? "This coupon code already exists." : "Could not create the coupon." };
  }
  revalidatePath("/admin/settings/coupons");
  return { success: true, coupon: data };
}

export async function toggleCoupon(id, isActive) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("coupons").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings/coupons");
  return { success: true };
}

export async function deleteCoupon(id) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings/coupons");
  return { success: true };
}
