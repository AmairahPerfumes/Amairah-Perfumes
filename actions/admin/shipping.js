"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { SHIPPING_DEFAULTS, COD_ADVANCE_DEFAULTS } from "@/lib/constants";
import { isAdminRequest } from "@/lib/adminAuth";

export async function getShippingSettings() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("shipping").eq("id", 1).maybeSingle();
  const shipping = data?.shipping || SHIPPING_DEFAULTS;
  return { ...shipping, cod_advance: { ...COD_ADVANCE_DEFAULTS, ...(shipping.cod_advance || {}) } };
}

export async function updateShippingSettings(_prevState, formData) {
  if (!(await isAdminRequest())) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const money = (key, max = 100000) => {
    const n = Number(formData.get(key) || 0);
    return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), max) : 0;
  };

  const codAdvance = {
    enabled: formData.get("cod_advance_enabled") === "on",
    amount: money("cod_advance_amount", 1000),
    high_amount: money("cod_advance_high_amount", 1000),
    high_threshold: money("cod_advance_high_threshold"),
  };
  if (codAdvance.enabled && codAdvance.amount < 1) {
    return { error: "Enter an advance amount of at least ₹1 (₹50–₹100 recommended)." };
  }

  const shipping = {
    flat_rate: money("flat_rate"),
    free_threshold: money("free_threshold"),
    cod_charge: money("cod_charge"),
    cod_advance: codAdvance,
  };

  const { error } = await supabase.from("settings").update({ shipping }).eq("id", 1);
  if (error) return { error: error.message };

  revalidatePath("/admin/settings/shipping");
  revalidatePath("/checkout");
  return { success: true };
}
