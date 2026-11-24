"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";

export async function getAllAnnouncements() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function createAnnouncement(message) {
  await requireAdmin();
  const text = String(message || "").trim();
  if (!text) return { success: false, error: "Message is required." };
  if (text.length > 200) return { success: false, error: "Keep it under 200 characters." };
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("announcements").insert({ message: text }).select("*").single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidateTag("announcements");
  return { success: true, announcement: data };
}

export async function toggleAnnouncement(id, isActive) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("announcements").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidateTag("announcements");
  return { success: true };
}

export async function updateAnnouncement(id, message) {
  await requireAdmin();
  const text = String(message || "").trim();
  if (!id || typeof id !== "string") return { success: false, error: "Invalid announcement." };
  if (!text) return { success: false, error: "Message is required." };
  if (text.length > 200) return { success: false, error: "Keep it under 200 characters." };
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("announcements").update({ message: text }).eq("id", id).select("*").single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidateTag("announcements");
  return { success: true, announcement: data };
}

export async function deleteAnnouncement(id) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/");
  revalidateTag("announcements");
  return { success: true };
}
