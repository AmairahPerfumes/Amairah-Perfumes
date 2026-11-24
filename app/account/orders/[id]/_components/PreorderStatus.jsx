import { CalendarClock, Check, ExternalLink } from "lucide-react";
import Reveal from "@/components/Reveal";
import { PREORDER_STAGES, preorderStageIndex, preorderBalanceDue, formatDispatchDate } from "@/lib/preorder";

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// Customer-facing pre-order progress: stage tracker, expected dispatch date,
// and — once the admin marks the order ready — the balance to pay.
export default function PreorderStatus({ order }) {
  const stageIndex = preorderStageIndex(order);
  const dispatch = formatDispatchDate(order.expected_dispatch_date);
  const due = preorderBalanceDue(order);
  // Only ever link out to Razorpay's https payment page.
  const payUrl =
    order.balance_status === "pending" && typeof order.balance_payment_link_url === "string" && order.balance_payment_link_url.startsWith("https://")
      ? order.balance_payment_link_url
      : null;
  const cancelled = order.order_status === "cancelled";

  return (
    <Reveal delay={20} className="card-panel p-6 sm:p-8 hover:border-gold-400/20 transition-all duration-300">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/20 bg-gold-400/10 text-gold-300 shadow-[0_0_15px_rgba(212,163,89,0.1)]">
          <CalendarClock className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl text-ivory">Pre-Order Status</h2>
      </div>

      {dispatch && !cancelled && (
        <p className="mb-5 text-base text-ivory/70">
          Expected dispatch: <span className="font-semibold text-gold-200">{dispatch}</span>
        </p>
      )}

      {stageIndex >= 0 && (
        <ol className="space-y-3">
          {PREORDER_STAGES.map((label, i) => {
            const done = i < stageIndex;
            const current = i === stageIndex;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    done
                      ? "border-green-400/40 bg-green-500/15 text-green-300"
                      : current
                      ? "border-gold-300/60 bg-gold-400/15 text-gold-200 shadow-[0_0_12px_rgba(212,163,89,0.25)]"
                      : "border-ivory/10 text-ivory/25"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`text-base ${current ? "font-semibold text-gold-200" : done ? "text-ivory/60" : "text-ivory/30"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {order.advance_status !== "paid" && !cancelled && (
        <p className="text-base text-amber-300/80">We haven&apos;t received your advance payment yet.</p>
      )}

      <div className="mt-6 space-y-2 rounded-xl border border-gold-400/15 bg-gold-400/5 p-4 text-base">
        <div className="flex justify-between text-ivory/60">
          <span>Advance paid</span>
          <span className={order.advance_status === "paid" ? "font-semibold text-green-400" : "font-semibold text-amber-300"}>
            {rupees(order.advance_amount)}
          </span>
        </div>
        <div className="flex justify-between border-t border-gold-400/10 pt-2 text-ivory">
          <span>{due > 0 ? "Balance to pay" : "Balance"}</span>
          <span className={due > 0 ? "font-semibold text-gold-200" : "font-semibold text-green-400"}>
            {due > 0 ? rupees(due) : "Paid"}
          </span>
        </div>
      </div>

      {payUrl && due > 0 && !cancelled && (
        <div className="mt-5">
          <p className="mb-3 text-sm text-ivory/60">Your order is ready! Pay the remaining balance to have it dispatched.</p>
          <a
            href={payUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold inline-flex items-center gap-2 px-7 py-3.5 text-xs font-semibold uppercase tracking-widest"
          >
            <ExternalLink className="h-4 w-4" /> Pay {rupees(due)} Now
          </a>
        </div>
      )}
      {!payUrl && due > 0 && order.advance_status === "paid" && !cancelled && (
        <p className="mt-5 text-sm text-ivory/45">
          We&apos;ll send you a payment link by SMS &amp; email for the balance as soon as your order is ready.
        </p>
      )}
    </Reveal>
  );
}
