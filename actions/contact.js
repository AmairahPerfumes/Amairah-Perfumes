"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitInquiry(_prevState, formData) {
  // Public form: coerce to strings and cap lengths so it can't be used to
  // stuff the database with huge payloads.
  const clean = (v, max) => String(v ?? "").trim().slice(0, max);
  const name = clean(formData.get("name"), 100);
  const email = clean(formData.get("email"), 200);
  const phone = clean(formData.get("phone"), 20);
  const message = clean(formData.get("message"), 2000);

  if (!name || !message) {
    return { error: "Please share your name and a short message." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").insert({
    name,
    email: email || null,
    phone: phone || null,
    message,
  });

  if (error) return { error: "Something went wrong. Please try WhatsApp instead." };

  return { success: true };
}
