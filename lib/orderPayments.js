// Shared "a Razorpay payment succeeded" logic, used by the post-payment verify
// call (actions/checkout.js), the Razorpay webhook and the admin "check payment"
// action. Any of them can arrive first (or twice), so each paid-state flip is a
// conditional UPDATE: only the caller that actually changes the row does the
// follow-up work (stock), so nothing is ever applied twice.

// An order whose first payment is only an ADVANCE: a COD order with an advance,
// or a pre-order (advance now, balance later).
export function isAdvanceOrder(order) {
  if (!(Number(order?.advance_amount) > 0)) return false;
  return order.payment_method === "COD" || Boolean(order.is_preorder);
}

// Kept for the webhook's log messages.
export function isCodAdvanceOrder(order) {
  return order?.payment_method === "COD" && Number(order?.advance_amount) > 0;
}

async function decrementStockForItems(admin, items) {
  for (const item of items || []) {
    if (!item.variant_id) continue;
    const { data: variant } = await admin
      .from("product_variants")
      .select("stock_quantity")
      .eq("id", item.variant_id)
      .maybeSingle();
    if (variant) {
      await admin
        .from("product_variants")
        .update({ stock_quantity: Math.max(0, variant.stock_quantity - item.quantity) })
        .eq("id", item.variant_id);
    }
  }
}

// First (or only) payment for an order, made against the Razorpay order that
// was created at checkout.
// order: { id, payment_method, advance_amount, is_preorder, balance_amount, order_items: [...] }
export async function applyRazorpayPayment(admin, order, razorpayPaymentId) {
  const advance = isAdvanceOrder(order);
  const patch = {
    ...(advance ? { advance_status: "paid" } : { payment_status: "paid" }),
    order_status: "processing",
    updated_at: new Date().toISOString(),
  };
  // A pre-order whose advance covers the whole amount has nothing left to collect.
  if (advance && order.is_preorder && !(Number(order.balance_amount) > 0)) {
    patch.payment_status = "paid";
  }
  if (razorpayPaymentId) patch.razorpay_payment_id = razorpayPaymentId;

  let query = admin.from("orders").update(patch).eq("id", order.id);
  query = advance ? query.neq("advance_status", "paid") : query.neq("payment_status", "paid");
  const { data: changed, error } = await query.select("id");
  if (error) return { ok: false, error: error.message };
  if (!changed?.length) return { ok: true, changed: false };

  // Pre-orders are made-to-order / next batch: they never draw down ready stock.
  if (!order.is_preorder) await decrementStockForItems(admin, order.order_items);
  return { ok: true, changed: true };
}

// Second payment of a pre-order (the Razorpay Payment Link sent when the admin
// marks it "ready for dispatch").
export async function applyBalancePayment(admin, order, razorpayPaymentId) {
  const patch = {
    balance_status: "paid",
    payment_status: "paid",
    balance_paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (razorpayPaymentId) patch.balance_payment_id = razorpayPaymentId;

  const { data: changed, error } = await admin
    .from("orders")
    .update(patch)
    .eq("id", order.id)
    .eq("is_preorder", true)
    .neq("balance_status", "paid")
    .select("id");
  if (error) return { ok: false, error: error.message };
  return { ok: true, changed: Boolean(changed?.length) };
}

// Look the order up by our id, falling back to the Razorpay order id (the
// payment entity doesn't always carry our id in its notes).
export async function findOrderForPayment(admin, { internalOrderId, razorpayOrderId }) {
  const select =
    "id, payment_method, payment_status, advance_amount, advance_status, is_preorder, balance_amount, balance_status, razorpay_order_id, order_items(variant_id, quantity)";
  if (internalOrderId) {
    const { data } = await admin.from("orders").select(select).eq("id", internalOrderId).maybeSingle();
    if (data) return data;
  }
  if (razorpayOrderId) {
    const { data } = await admin.from("orders").select(select).eq("razorpay_order_id", razorpayOrderId).maybeSingle();
    if (data) return data;
  }
  return null;
}

// For payment_link.paid: find the pre-order by the link id (or our id in notes).
export async function findOrderForBalanceLink(admin, { linkId, internalOrderId }) {
  const select = "id, is_preorder, balance_amount, balance_status, balance_payment_link_id";
  if (linkId) {
    const { data } = await admin.from("orders").select(select).eq("balance_payment_link_id", linkId).maybeSingle();
    if (data) return data;
  }
  if (internalOrderId) {
    const { data } = await admin.from("orders").select(select).eq("id", internalOrderId).maybeSingle();
    if (data && data.balance_payment_link_id === linkId) return data;
  }
  return null;
}
