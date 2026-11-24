"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, PackageCheck, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { saveManualShipment, removeManualShipment } from "@/actions/admin/shipments";
import FilterSelect from "@/components/admin/FilterSelect";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-2.5 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-ivory/50";
const OTHER = "__other__";

function ShipmentForm({ order, couriers, onDone, onCancel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = couriers.filter((c) => c.is_active);
  const existing = active.find((c) => c.name === order.courier_name);

  const [courierId, setCourierId] = useState(
    order.is_manual_shipment ? (existing ? existing.id : OTHER) : active[0]?.id || OTHER
  );
  const [customName, setCustomName] = useState(order.is_manual_shipment && !existing ? order.courier_name : "");
  const [trackingNumber, setTrackingNumber] = useState(order.is_manual_shipment ? order.tracking_number : "");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [note, setNote] = useState(order.shipping_note || "");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await saveManualShipment(order.id, {
        courier_id: courierId === OTHER ? undefined : courierId,
        courier_name: courierId === OTHER ? customName : undefined,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        shipping_note: note,
      });
      if (result.success) {
        onDone();
        window.location.reload();
      } else {
        setError(result.error || "Could not save.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className={labelClass}>Courier</label>
        <FilterSelect
          value={courierId}
          onChange={(e) => setCourierId(e.target.value)}
          buttonClassName="rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-2.5 text-sm text-ivory hover:border-gold-400/20"
          options={[...active.map((c) => ({ value: c.id, label: c.name })), { value: OTHER, label: "Other (type name)…" }]}
        />
        {active.length === 0 && (
          <p className="mt-1.5 text-xs text-ivory/40">
            No couriers saved yet — <Link href="/admin/settings/couriers" className="text-gold-300 hover:underline">add some</Link> for a quick dropdown.
          </p>
        )}
      </div>
      {courierId === OTHER && (
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          maxLength={60}
          placeholder="Courier name"
          className={inputClass}
          required
        />
      )}
      <div>
        <label className={labelClass}>Tracking ID</label>
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          maxLength={40}
          placeholder="e.g. EE123456789IN"
          className={`${inputClass} font-mono`}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Tracking link</label>
        <input
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          placeholder="Optional — auto from courier"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Note for customer</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Optional — e.g. 5–7 days"
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-col gap-2 pt-1">
        <button type="submit" disabled={pending} className="btn-gold w-full whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide disabled:opacity-60">
          {pending ? "Saving…" : order.is_manual_shipment ? "Update Tracking" : "Save & Mark Shipped"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="w-full rounded-xl border border-gold-400/15 bg-ink/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ivory/60 hover:text-ivory"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ManualShipmentManager({ order, couriers }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const handleRemove = () => {
    if (!window.confirm("Remove these tracking details? The customer will no longer see them.")) return;
    setError("");
    startTransition(async () => {
      const result = await removeManualShipment(order.id);
      if (result.success) router.refresh();
      else setError(result.error || "Could not remove.");
    });
  };

  // Already shipped manually: show details + edit/remove.
  if (order.is_manual_shipment && order.tracking_number) {
    return (
      <div className="mt-5 space-y-4 border-t border-gold-400/10 pt-5">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-gold-300" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ivory/40">Shipment (Manual)</h3>
        </div>

        {open ? (
          <ShipmentForm order={order} couriers={couriers} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-gold-400/10 bg-gradient-to-b from-white/[0.03] to-transparent p-3.5 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ivory/35">Courier</p>
                <p className="mt-0.5 text-ivory/85">{order.courier_name}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ivory/35">Tracking ID</p>
                <p className="mt-0.5 break-all font-mono text-ivory/85 select-all">{order.tracking_number}</p>
              </div>
              {order.shipping_note && (
                <div className="col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-ivory/35">Note</p>
                  <p className="mt-0.5 text-ivory/70">{order.shipping_note}</p>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="grid grid-cols-3 gap-2">
              {order.tracking_url ? (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gold-400/15 bg-gold-400/5 px-2 py-2 text-xs font-semibold text-gold-200 hover:bg-gold-400/10"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Track
                </a>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-gold-400/5 px-2 py-2 text-xs text-ivory/25">No link</span>
              )}
              <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={pending}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gold-400/15 bg-gold-400/5 px-2 py-2 text-xs font-semibold text-gold-200 hover:bg-gold-400/10 disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={pending}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/5 px-2 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Not shipped yet: offer to add tracking by hand.
  return (
    <div className="mt-4">
      {open ? (
        <div className="space-y-3 border-t border-gold-400/10 pt-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-gold-300" />
            <h3 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-ivory/50">Manual tracking</h3>
          </div>
          <ShipmentForm order={order} couriers={couriers} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-gold-400/20 bg-ink/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gold-200 transition-colors hover:bg-gold-400/10"
        >
          Ship via Other Courier
        </button>
      )}
    </div>
  );
}
