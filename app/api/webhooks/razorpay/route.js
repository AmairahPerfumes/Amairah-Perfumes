import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyRazorpayPayment,
  applyBalancePayment,
  findOrderForPayment,
  findOrderForBalanceLink,
  isAdvanceOrder,
} from "@/lib/orderPayments";

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Razorpay Webhook Error]: RAZORPAY_WEBHOOK_SECRET is not configured on server.");
      return NextResponse.json(
        { success: false, error: "Webhook secret is not configured on server environment" },
        { status: 500 }
      );
    }

    if (!signature) {
      console.error("[Razorpay Webhook Error]: Missing x-razorpay-signature header.");
      return NextResponse.json(
        { success: false, error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    // Verify HMAC SHA-256 signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    let isValid = false;
    if (signatureBuffer.length === expectedBuffer.length) {
      isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    }

    if (!isValid) {
      console.error("[Razorpay Webhook Error]: Signature mismatch. Untrusted webhook payload received.");
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // Parse verified payload
    const eventData = JSON.parse(rawBody);
    const event = eventData.event;
    const payload = eventData.payload;

    console.log(`[Razorpay Webhook]: Received valid event '${event}'`);

    const supabaseAdmin = createAdminClient();

    switch (event) {
      case "payment.captured": {
        const payment = payload?.payment?.entity;
        if (!payment) break;

        const razorpayPaymentId = payment.id;
        const razorpayOrderId = payment.order_id;
        const internalOrderId = payment.notes?.internal_order_id || payment.notes?.order_id || null;

        console.log(`[Razorpay Webhook]: Processing payment.captured for payment ${razorpayPaymentId}, order ${razorpayOrderId}`);

        const order = await findOrderForPayment(supabaseAdmin, { internalOrderId, razorpayOrderId });
        if (!order) {
          console.error("[Razorpay Webhook Error]: No matching order for payment", razorpayPaymentId);
          break;
        }
        // A pre-order's balance is paid through a Payment Link (its own Razorpay
        // order) and handled by the payment_link.paid event, not here.
        if (order.is_preorder && razorpayOrderId !== order.razorpay_order_id) break;

        const applied = await applyRazorpayPayment(supabaseAdmin, order, razorpayPaymentId);
        if (!applied.ok) {
          console.error("[Razorpay Webhook Error]: DB update failed for payment.captured:", applied.error);
        } else if (applied.changed) {
          console.log(`[Razorpay Webhook]: ${isAdvanceOrder(order) ? "COD advance" : "Payment"} marked paid, order moved to processing.`);
        }
        break;
      }

      case "payment.failed": {
        const payment = payload?.payment?.entity;
        if (!payment) break;

        const razorpayPaymentId = payment.id;
        const razorpayOrderId = payment.order_id;
        const internalOrderId = payment.notes?.internal_order_id || payment.notes?.order_id || null;
        const errorDescription = payment.error_description || "Payment transaction failed";

        console.log(`[Razorpay Webhook]: Processing payment.failed for payment ${razorpayPaymentId}, reason: ${errorDescription}`);

        const order = await findOrderForPayment(supabaseAdmin, { internalOrderId, razorpayOrderId });
        if (!order) break;
        // A failed attempt on the balance link must not touch the advance.
        if (order.is_preorder && razorpayOrderId !== order.razorpay_order_id) break;

        // A COD order's advance failing must not mark the whole COD order as
        // a failed payment; and a failed attempt never overrides a success.
        const patch = isAdvanceOrder(order)
          ? { advance_status: "failed", updated_at: new Date().toISOString() }
          : { payment_status: "failed", updated_at: new Date().toISOString() };
        const guardColumn = isAdvanceOrder(order) ? "advance_status" : "payment_status";
        const { error: updateErr } = await supabaseAdmin
          .from("orders")
          .update(patch)
          .eq("id", order.id)
          .neq(guardColumn, "paid");

        if (updateErr) {
          console.error("[Razorpay Webhook Error]: DB update failed for payment.failed:", updateErr.message);
        }
        break;
      }

      case "order.paid": {
        const orderEntity = payload?.order?.entity;
        if (!orderEntity) break;

        const razorpayOrderId = orderEntity.id;
        const internalOrderId = orderEntity.notes?.internal_order_id || orderEntity.notes?.order_id || null;
        const razorpayPaymentId = payload?.payment?.entity?.id || null;

        console.log(`[Razorpay Webhook]: Processing order.paid for razorpay order ${razorpayOrderId}`);

        const order = await findOrderForPayment(supabaseAdmin, { internalOrderId, razorpayOrderId });
        if (!order) {
          console.error("[Razorpay Webhook Error]: No matching order for razorpay order", razorpayOrderId);
          break;
        }
        if (order.is_preorder && razorpayOrderId !== order.razorpay_order_id) break;

        const applied = await applyRazorpayPayment(supabaseAdmin, order, razorpayPaymentId);
        if (!applied.ok) {
          console.error("[Razorpay Webhook Error]: DB update failed for order.paid:", applied.error);
        } else if (applied.changed) {
          console.log(`[Razorpay Webhook]: ${isAdvanceOrder(order) ? "COD advance" : "Payment"} marked paid, order moved to processing.`);
        }
        break;
      }

      case "payment_link.paid": {
        const link = payload?.payment_link?.entity;
        if (!link) break;

        const razorpayPaymentId = payload?.payment?.entity?.id || null;
        const internalOrderId = link.notes?.internal_order_id || null;

        console.log(`[Razorpay Webhook]: Processing payment_link.paid for link ${link.id}`);

        const order = await findOrderForBalanceLink(supabaseAdmin, { linkId: link.id, internalOrderId });
        if (!order) {
          console.error("[Razorpay Webhook Error]: No pre-order matches payment link", link.id);
          break;
        }

        // Only accept it if the full balance was actually paid (amounts are in paise).
        if (Number(link.amount_paid) < Math.round(Number(order.balance_amount) * 100)) {
          console.error("[Razorpay Webhook Error]: Payment link underpaid for order", order.id);
          break;
        }

        const applied = await applyBalancePayment(supabaseAdmin, order, razorpayPaymentId);
        if (!applied.ok) {
          console.error("[Razorpay Webhook Error]: DB update failed for payment_link.paid:", applied.error);
        } else if (applied.changed) {
          console.log("[Razorpay Webhook]: Pre-order balance marked paid — order is fully paid.");
        }
        break;
      }

      default:
        console.log(`[Razorpay Webhook]: Unhandled event type '${event}' acknowledged.`);
        break;
    }

    return NextResponse.json({ success: true, event }, { status: 200 });
  } catch (error) {
    console.error("[Razorpay Webhook Critical Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
