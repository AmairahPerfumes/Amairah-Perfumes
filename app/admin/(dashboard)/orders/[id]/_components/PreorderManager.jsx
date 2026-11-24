"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Copy, Check, Send, RefreshCw, Link2 } from "lucide-react";
import {
  markReadyForDispatch,
  resendBalanceLink,
  checkBalancePayment,
  updateExpectedDispatchDate,
} from "@/actions/admin/preorders";
import { PREORDER_STAGES, preorderStageIndex } from "@/lib/preorder";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-2.5 text-sm text-ivory transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const labelClass = "mb-1.5 block text-sm font-semibold uppercase tracking-wide text-ivory/40";
const smallBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-gold-400/15 bg-gold-400/5 px-3 py-2 text-xs font-semibold text-gold-200 transition-colors hover:bg-gold-400/10 disabled:opacity-50";

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function PreorderManager({ order }) {
  const router = useRouter();
  // Plain state (not useTransition): a transition that also calls router.refresh()
  // can stay "pending" forever and leave every button disabled.
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }
  const [copied, setCopied] = useState(false);
  const [date, setDate] = useState(order.expected_dispatch_date || "");

  const stageIndex = preorderStageIndex(order);
  const advancePaid = order.advance_status === "paid";
  const balance = Number(order.balance_amount) || 0;
  const balancePaid = order.balance_status === "paid" || balance <= 0;
  const cancelled = order.order_status === "cancelled";

  // opts.reload: after a state-changing action do a hard reload (router.refresh()
  // alone sometimes leaves stale data on screen, and the page's shipping-lock
  // note is rendered by the server). "ifPaid" reloads only when the result says paid.
  const run = async (fn, okText, opts = {}) => {
    setPending(true);
    setMessage(null);
    try {
      const result = await fn();
      if (result?.success === false) setMessage({ type: "error", text: result.error || "Something went wrong." });
      else {
        setMessage({ type: "ok", text: okText(result) });
        if (opts.reload === true || (opts.reload === "ifPaid" && result?.paid)) {
          setTimeout(() => window.location.reload(), 1800);
        } else {
          router.refresh();
        }
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(order.balance_payment_link_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage({ type: "error", text: "Couldn't copy — select the link and copy it manually." });
    }
  };

  return (
    <div className="mt-5 space-y-4 border-t border-gold-400/10 pt-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-gold-300" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ivory/40">Pre-Order</h3>
      </div>

      {/* Stage tracker */}
      <ol className="space-y-1.5">
        {PREORDER_STAGES.map((label, i) => {
          const done = stageIndex >= 0 && i < stageIndex;
          const current = i === stageIndex;
          return (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  done
                    ? "border-green-400/40 bg-green-500/15 text-green-300"
                    : current
                    ? "border-gold-300/60 bg-gold-400/15 text-gold-200"
                    : "border-ivory/10 text-ivory/25"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={current ? "font-semibold text-gold-200" : done ? "text-ivory/60" : "text-ivory/30"}>{label}</span>
            </li>
          );
        })}
      </ol>

      {/* Money */}
      <div className="space-y-1.5 rounded-xl border border-gold-400/15 bg-gold-400/5 p-3.5 text-sm">
        <div className="flex justify-between text-ivory/70">
          <span>Advance ({order.advance_status})</span>
          <span className={advancePaid ? "font-semibold text-green-300" : "font-semibold text-amber-300"}>{rupees(order.advance_amount)}</span>
        </div>
        <div className="flex justify-between text-ivory/70">
          <span>Balance ({balancePaid ? "paid" : order.balance_status === "pending" ? "link sent" : "not requested"})</span>
          <span className={balancePaid ? "font-semibold text-green-300" : "font-semibold text-ivory"}>{rupees(balance)}</span>
        </div>
      </div>

      {/* Expected dispatch date */}
      <div>
        <label className={labelClass}>Expected Dispatch Date</label>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          <button
            type="button"
            disabled={pending || date === (order.expected_dispatch_date || "")}
            onClick={() => run(() => updateExpectedDispatchDate(order.id, date), () => "Dispatch date updated.")}
            className={smallBtn}
          >
            Save
          </button>
        </div>
      </div>

      {/* Actions */}
      {cancelled ? (
        <p className="text-sm text-ivory/40">This order is cancelled.</p>
      ) : !advancePaid ? (
        <p className="text-sm text-amber-300/80">Waiting for the customer&apos;s advance payment.</p>
      ) : balancePaid ? (
        <p className="rounded-xl border border-green-400/20 bg-green-500/10 p-3 text-sm text-green-300">
          Fully paid — you can ship this order now.
        </p>
      ) : order.balance_status === "pending" && order.balance_payment_link_url ? (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Balance Payment Link</label>
            <input readOnly value={order.balance_payment_link_url} onFocus={(e) => e.target.select()} className={`${inputClass} font-mono text-xs`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copyLink} className={smallBtn}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy Link"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => checkBalancePayment(order.id), (r) => (r.paid ? "Payment received — marked fully paid." : "Not paid yet."), { reload: "ifPaid" })}
              className={smallBtn}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} /> Check Payment
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resendBalanceLink(order.id, "sms"), () => "SMS sent.")}
              className={smallBtn}
            >
              <Send className="h-3.5 w-3.5" /> Resend SMS
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resendBalanceLink(order.id, "email"), () => "Email sent.")}
              className={smallBtn}
            >
              <Send className="h-3.5 w-3.5" /> Resend Email
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Cancel the old link and send a new one? The customer will get a fresh SMS/email.")) {
                run(() => markReadyForDispatch(order.id, { regenerate: true }), () => "New payment link sent.");
              }
            }}
            className="w-full text-center text-xs text-ivory/40 underline-offset-2 hover:text-gold-300 hover:underline"
          >
            Generate a new link
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => markReadyForDispatch(order.id),
              (r) =>
                !r.emailed && !r.texted
                  ? "Payment link created, but this customer has no email or valid mobile number on file — copy the link and share it."
                  : `Payment link created and sent to the customer by ${[r.texted && "SMS", r.emailed && "email"].filter(Boolean).join(" & ")}.`,
              { reload: true }
            )
          }
          className="btn-gold flex w-full items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide disabled:opacity-60"
        >
          <Link2 className="h-4 w-4" /> {pending ? "Sending…" : `Mark Ready for Dispatch — Request ${rupees(balance)}`}
        </button>
      )}

      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-300" : "text-red-400"}`}>{message.text}</p>
      )}
    </div>
  );
}
