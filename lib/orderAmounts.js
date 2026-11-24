// How much of an order has been paid so far and how much is still to collect.
// Pure helper shared by the admin pages, the customer order page and the
// admin orders list so they always show the same numbers.
//
//   fully paid (payment_status "paid")      -> paid = total, due = 0
//   advance paid (COD advance / pre-order)  -> paid = advance, due = total - advance
//   nothing received yet                    -> paid = 0, due = total
export function orderAmounts(order) {
  const total = Math.max(0, Number(order?.total_amount) || 0);
  let paid = 0;
  if (order?.payment_status === "paid") paid = total;
  else if (order?.advance_status === "paid") paid = Math.min(total, Math.max(0, Number(order.advance_amount) || 0));
  const due = Math.max(0, total - paid);

  // What the remaining amount is for, so the label reads naturally.
  let dueLabel = "Balance due";
  if (due > 0) {
    if (order?.is_preorder) dueLabel = "Balance (payable when order is ready)";
    else if (order?.payment_method === "COD") dueLabel = "Balance to pay on delivery";
    else dueLabel = "Amount due";
  }
  const paidLabel =
    paid === 0 ? "Paid" : paid >= total ? "Paid in full" : order?.is_preorder ? "Advance paid" : "Advance paid online";

  return { total, paid, due, paidLabel, dueLabel };
}
