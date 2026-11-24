"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";

export async function getAllInquiries() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function resolveInquiry(id, isResolved) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("inquiries").update({ is_resolved: isResolved }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/inquiries");
  return { success: true };
}

export async function deleteInquiry(id) {
  await requireAdmin();
  if (!id || typeof id !== "string" || id.length > 64) return { success: false, error: "Invalid inquiry." };
  const supabase = createAdminClient();
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) return { success: false, error: "Could not delete the inquiry." };
  revalidatePath("/admin/inquiries");
  return { success: true };
}
