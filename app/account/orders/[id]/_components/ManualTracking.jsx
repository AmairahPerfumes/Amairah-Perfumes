import { Truck, ExternalLink, Info } from "lucide-react";
import Reveal from "@/components/Reveal";

// Shipment card for orders the admin shipped with another courier (e.g. India
// Post) and entered tracking for by hand. No live scans — just the details and
// a link to the courier's own tracking page.
export default function ManualTracking({ courierName, trackingNumber, trackingUrl, shippedAt, note }) {
  const shippedOn = shippedAt
    ? new Date(shippedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <Reveal delay={40} className="card-panel p-6 sm:p-8 hover:border-gold-400/20 transition-all duration-300">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/20 bg-gold-400/10 text-gold-300 shadow-[0_0_15px_rgba(212,163,89,0.1)]">
          <Truck className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl text-ivory">Shipment Tracking</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gold-400/10 bg-gradient-to-b from-white/[0.03] to-transparent p-3.5 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ivory/35">Shipped Via</p>
          <p className="mt-0.5 text-ivory/85">{courierName}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ivory/35">Tracking ID</p>
          <p className="mt-0.5 break-all font-mono text-ivory/85 select-all">{trackingNumber}</p>
        </div>
        {shippedOn && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ivory/35">Shipped On</p>
            <p className="mt-0.5 text-ivory/85">{shippedOn}</p>
          </div>
        )}
      </div>

      {note && (
        <p className="mt-4 flex items-start gap-2 text-sm text-ivory/60">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-300/70" /> {note}
        </p>
      )}

      {trackingUrl && (
        <>
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold-400/20 bg-gold-400/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gold-200 transition-all duration-300 hover:border-gold-300/40 hover:bg-gold-400/10"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Track on {courierName}
          </a>
          <p className="mt-3 text-xs text-ivory/35">
            If the tracking page asks for a number, copy the Tracking ID above and paste it there.
          </p>
        </>
      )}
    </Reveal>
  );
}
