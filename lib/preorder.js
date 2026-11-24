// Pre-order rules + display helpers, shared by the server (what is actually
// charged) and the UI (what the customer sees) so they always agree.

// A variant is sold as a pre-order when:
//   - the product has pre-order mode on (launch / limited drop), or
//   - the product allows pre-order when out of stock AND this size has no stock.
// A misconfigured product (advance ₹0) is never treated as a pre-order.
export function preorderInfo(product, variant) {
  const advance = Math.round(Number(product?.preorder_advance_amount) || 0);
  const none = { isPreorder: false, kind: null, advance: 0, dispatchDate: null };
  if (!product || advance <= 0) return none;

  let kind = null;
  if (product.preorder_enabled) kind = "open";
  else if (product.allow_preorder_oos && Number(variant?.stock_quantity ?? 0) <= 0) kind = "next_batch";
  if (!kind) return none;

  return { isPreorder: true, kind, advance, dispatchDate: product.preorder_dispatch_date || null };
}

export function formatDispatchDate(value) {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Customer-facing stages of a pre-order (matches the admin flow).
export const PREORDER_STAGES = [
  "Pre-Order Confirmed",
  "Processing",
  "Balance Payment Pending",
  "Fully Paid",
  "Ready to Ship",
  "Dispatched",
  "Delivered",
];

// Index into PREORDER_STAGES that the order has reached, or -1 if the advance
// isn't paid yet / the order is cancelled.
export function preorderStageIndex(order) {
  if (!order || order.order_status === "cancelled" || order.advance_status !== "paid") return -1;
  if (order.order_status === "delivered") return 6;
  if (order.order_status === "shipped") return 5;
  const balanceDone = order.balance_status === "paid" || Number(order.balance_amount) <= 0;
  if (balanceDone) return 4;
  if (order.balance_status === "pending") return 2;
  return 1;
}

export function preorderBalanceDue(order) {
  if (!order?.is_preorder) return 0;
  if (order.balance_status === "paid") return 0;
  return Math.max(0, Number(order.balance_amount) || 0);
}
