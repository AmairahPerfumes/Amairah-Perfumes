"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/adminAuth";
import { getRazorpay } from "@/lib/razorpay";
import { applyBalancePayment } from "@/lib/orderPayments";

const UNAUTHORIZED = { success: false, error: "Not authorized." };
const ORDER_SELECT = `
  id, order_number, order_status, is_preorder, advance_status, balance_amount, balance_status,
  balance_payment_link_id, balance_payment_link_url,
  profiles ( full_name, email ),
  addresses ( full_name, phone )
`;

function refresh(orderId) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/account/orders/${orderId}`);
}

function razorpayError(e, fallback) {
  const reason = e?.error?.description || e?.message;
  console.error("Razorpay payment-link error:", e?.error || e);
  return { success: false, error: reason ? `${fallback} (${reason})` : fallback };
}

async function loadPreorder(orderId) {
  if (!orderId || typeof orderId !== "string") return { error: "Invalid order." };
  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  if (!order) return { error: "Order not found." };
  if (!order.is_preorder) return { error: "This is not a pre-order." };
  return { supabase, order };
}

// "Mark Ready for Dispatch": creates a Razorpay Payment Link for the remaining
// balance and has Razorpay send it to the customer by email and, when the order
// has a valid Indian mobile number, by SMS too.
export async function markReadyForDispatch(orderId, { regenerate = false } = {}) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  const loaded = await loadPreorder(orderId);
  if (loaded.error) return { success: false, error: loaded.error };
  const { supabase, order } = loaded;

  if (order.order_status === "cancelled") return { success: false, error: "This order is cancelled." };
  if (order.advance_status !== "paid") return { success: false, error: "The advance hasn't been paid yet." };
  const balance = Math.round(Number(order.balance_amount) || 0);
  if (balance <= 0 || order.balance_status === "paid") {
    return { success: false, error: "Nothing left to collect on this order." };
  }
  if (order.balance_status === "pending" && order.balance_payment_link_url && !regenerate) {
    return { success: false, error: "A payment link was already sent. Use Resend, or Generate a new link." };
  }

  const razorpay = getRazorpay();
  if (!razorpay) return { success: false, error: "Razorpay is not configured." };

  try {
    // Replacing a link: cancel the old one first so the customer can't pay twice.
    if (regenerate && order.balance_payment_link_id) {
      try {
        await razorpay.paymentLink.cancel(order.balance_payment_link_id);
      } catch (e) {
        console.warn("Could not cancel old payment link (continuing):", e?.error?.description || e?.message);
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const phone = String(order.addresses?.phone || "").replace(/\D/g, "").slice(-10);
    const email = order.profiles?.email || null;
    const customer = { name: order.addresses?.full_name || order.profiles?.full_name || "Customer" };
    if (/^[6-9]\d{9}$/.test(phone)) customer.contact = `+91${phone}`;
    if (email) customer.email = email;

    const link = await razorpay.paymentLink.create({
      amount: balance * 100,
      currency: "INR",
      accept_partial: false,
      reference_id: `${order.order_number}-BAL${regenerate ? Date.now().toString().slice(-4) : ""}`.slice(0, 40),
      description: `Balance payment for pre-order ${order.order_number}`,
      customer,
      notify: { sms: Boolean(customer.contact), email: Boolean(customer.email) },
      reminder_enable: true,
      notes: { internal_order_id: order.id, leg: "balance" },
      ...(siteUrl.startsWith("https://")
        ? { callback_url: `${siteUrl}/account/orders/${order.id}`, callback_method: "get" }
        : {}),
    });

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("orders")
      .update({
        balance_status: "pending",
        balance_payment_link_id: link.id,
        balance_payment_link_url: link.short_url,
        balance_link_sent_at: now,
        ready_for_dispatch_at: now,
        updated_at: now,
      })
      .eq("id", order.id);
    if (error) return { success: false, error: "Link created but the order could not be updated. Copy it from Razorpay." };

    refresh(order.id);
    // Which channels Razorpay was asked to use (none -> the admin must share the link).
    return { success: true, url: link.short_url, emailed: Boolean(customer.email), texted: Boolean(customer.contact) };
  } catch (e) {
    return razorpayError(e, "Could not create the payment link.");
  }
}

// Re-send the existing link by SMS or email.
export async function resendBalanceLink(orderId, medium) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (medium !== "sms" && medium !== "email") return { success: false, error: "Invalid channel." };
  const loaded = await loadPreorder(orderId);
  if (loaded.error) return { success: false, error: loaded.error };
  const { order } = loaded;
  if (order.balance_status !== "pending" || !order.balance_payment_link_id) {
    return { success: false, error: "No active payment link on this order." };
  }

  const razorpay = getRazorpay();
  if (!razorpay) return { success: false, error: "Razorpay is not configured." };
  try {
    await razorpay.paymentLink.notifyBy(order.balance_payment_link_id, medium);
    return { success: true };
  } catch (e) {
    return razorpayError(e, `Could not send the ${medium === "sms" ? "SMS" : "email"}.`);
  }
}

// Fallback if the webhook was missed: ask Razorpay whether the link was paid.
export async function checkBalancePayment(orderId) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  const loaded = await loadPreorder(orderId);
  if (loaded.error) return { success: false, error: loaded.error };
  const { supabase, order } = loaded;
  if (order.balance_status === "paid") return { success: true, paid: true };
  if (!order.balance_payment_link_id) return { success: false, error: "No payment link has been created yet." };

  const razorpay = getRazorpay();
  if (!razorpay) return { success: false, error: "Razorpay is not configured." };
  try {
    const link = await razorpay.paymentLink.fetch(order.balance_payment_link_id);
    if (link.status === "paid" && Number(link.amount_paid) >= Math.round(Number(order.balance_amount) * 100)) {
      const paymentId = link.payments?.[0]?.payment_id || null;
      const applied = await applyBalancePayment(supabase, { id: order.id }, paymentId);
      if (!applied.ok) return { success: false, error: "Paid on Razorpay, but the order could not be updated." };
      refresh(order.id);
      return { success: true, paid: true };
    }
    return { success: true, paid: false, status: link.status };
  } catch (e) {
    return razorpayError(e, "Could not check the payment.");
  }
}

// Expected dispatch date shown to the customer on this order.
export async function updateExpectedDispatchDate(orderId, date) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  const value = String(date || "").trim();
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { success: false, error: "Enter a valid date." };
  const loaded = await loadPreorder(orderId);
  if (loaded.error) return { success: false, error: loaded.error };
  const { supabase, order } = loaded;

  const { error } = await supabase
    .from("orders")
    .update({ expected_dispatch_date: value || null, updated_at: new Date().toISOString() })
    .eq("id", order.id);
  if (error) return { success: false, error: "Could not save the date." };
  refresh(order.id);
  return { success: true };
}
