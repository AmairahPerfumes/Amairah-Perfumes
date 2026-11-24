"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/adminAuth";
import { cleanTrackingId, isValidTrackingId, cleanHttpUrl, buildTrackingUrl } from "@/lib/shipmentValidation";

const UNAUTHORIZED = { success: false, error: "Not authorized." };

function refresh(orderId) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/account/orders/${orderId}`);
}

// Save (or edit) a manually entered courier shipment — e.g. India Post.
// input: { courier_id?, courier_name?, tracking_number, tracking_url?, shipping_note? }
export async function saveManualShipment(orderId, input) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (!orderId || typeof orderId !== "string") return { success: false, error: "Invalid order." };

  const trackingNumber = cleanTrackingId(input?.tracking_number);
  if (!isValidTrackingId(trackingNumber)) {
    return { success: false, error: "Enter a valid tracking ID (3–40 letters, numbers, - or /)." };
  }

  const note = String(input?.shipping_note || "").trim();
  if (note.length > 300) return { success: false, error: "Note must be 300 characters or fewer." };

  try {
    const supabase = createAdminClient();

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_status, tracking_number, is_manual_shipment, shipped_at, is_preorder, balance_amount, balance_status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { success: false, error: "Order not found." };
    if (order.tracking_number && !order.is_manual_shipment) {
      return { success: false, error: "This order is already booked through Delhivery." };
    }
    if (order.order_status === "cancelled") {
      return { success: false, error: "This order is cancelled." };
    }
    if (order.is_preorder && Number(order.balance_amount) > 0 && order.balance_status !== "paid") {
      return { success: false, error: "Balance payment is still pending — dispatch this pre-order after it's paid." };
    }

    // Courier: a saved partner (name + optional tracking link template) or a one-off name.
    let courierName = String(input?.courier_name || "").trim().replace(/\s+/g, " ");
    let template = null;
    if (input?.courier_id) {
      const { data: courier } = await supabase
        .from("courier_partners")
        .select("name, tracking_url_template")
        .eq("id", input.courier_id)
        .maybeSingle();
      if (!courier) return { success: false, error: "Selected courier no longer exists." };
      courierName = courier.name;
      template = courier.tracking_url_template;
    }
    if (!courierName) return { success: false, error: "Choose or enter a courier name." };
    if (courierName.length > 60) return { success: false, error: "Courier name must be 60 characters or fewer." };

    let trackingUrl;
    const override = cleanHttpUrl(input?.tracking_url);
    if (override.error) return { success: false, error: override.error };
    trackingUrl = override.url || buildTrackingUrl(template, trackingNumber);

    const now = new Date().toISOString();
    const patch = {
      tracking_number: trackingNumber,
      courier_name: courierName,
      tracking_url: trackingUrl,
      is_manual_shipment: true,
      shipping_note: note || null,
      shipped_at: order.shipped_at || now,
      updated_at: now,
    };
    // Entering tracking means it has shipped — but never walk back a delivered order.
    if (order.order_status !== "delivered") patch.order_status = "shipped";

    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) return { success: false, error: "Could not save shipment details." };

    refresh(orderId);
    return { success: true };
  } catch {
    return { success: false, error: "Could not save shipment details." };
  }
}

// Clears a manual shipment (wrong ID entered, parcel re-sent, …).
export async function removeManualShipment(orderId) {
  if (!(await isAdminRequest())) return UNAUTHORIZED;
  if (!orderId || typeof orderId !== "string") return { success: false, error: "Invalid order." };

  try {
    const supabase = createAdminClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_status, is_manual_shipment")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { success: false, error: "Order not found." };
    if (!order.is_manual_shipment) {
      return { success: false, error: "Only manually added shipments can be removed here." };
    }

    const patch = {
      tracking_number: null,
      courier_name: "Delhivery", // column default (not null)
      tracking_url: null,
      shipment_status: null,
      shipped_at: null,
      is_manual_shipment: false,
      shipping_note: null,
      updated_at: new Date().toISOString(),
    };
    if (order.order_status === "shipped") patch.order_status = "processing";

    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) return { success: false, error: "Could not remove shipment details." };

    refresh(orderId);
    return { success: true };
  } catch {
    return { success: false, error: "Could not remove shipment details." };
  }
}
