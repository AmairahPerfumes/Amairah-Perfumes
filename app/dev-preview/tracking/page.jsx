import { Truck, ExternalLink, History } from "lucide-react";
import ShipmentStatusPill from "@/components/ShipmentStatusPill";
import { scanTone, formatScanTime } from "@/lib/shipmentTone";

// Temporary, no-DB preview of the customer shipment-tracking card design.
// Not linked from anywhere in the site nav — safe to delete after review.
export const metadata = { robots: { index: false, follow: false } };

const MOCK_SCANS = [
  { ScanDetail: { Scan: "Manifested", ScannedLocation: "Hyderabad_Gajularamaram_D (Telangana)", StatusDateTime: "2026-09-21T16:42:44" } },
  { ScanDetail: { Scan: "Pending", ScannedLocation: "Hyderabad_Gajularamaram_D (Telangana)", StatusDateTime: "2026-09-24T15:40:45" } },
  { ScanDetail: { Scan: "Dispatched", ScannedLocation: "Hyderabad_Gajularamaram_D (Telangana)", StatusDateTime: "2026-09-24T16:36:36" } },
  { ScanDetail: { Scan: "In Transit", ScannedLocation: "Hyderabad_Gajularamaram_D (Telangana)", StatusDateTime: "2026-09-24T18:20:53" } },
  { ScanDetail: { Scan: "Delivered", ScannedLocation: "Hyderabad_Gajularamaram_D (Telangana)", StatusDateTime: "2026-09-24T18:44:38" } },
];

export default function TrackingPreviewPage() {
  const scans = MOCK_SCANS;
  const liveStatus = scans[scans.length - 1].ScanDetail.Scan;

  return (
    <main className="min-h-screen bg-[#0b0a0a] p-6 sm:p-10">
      <div className="mx-auto max-w-lg">
        <p className="mb-4 text-center text-xs uppercase tracking-widest text-ivory/30">
          Preview only — mock data, not a real order
        </p>
        <div className="card-panel p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/20 bg-gold-400/10 text-gold-300 shadow-[0_0_15px_rgba(212,163,89,0.1)]">
                <Truck className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl text-ivory">Shipment Tracking</h2>
            </div>
            <ShipmentStatusPill status={liveStatus} />
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-gold-400/10 bg-gradient-to-b from-white/[0.03] to-transparent p-3.5 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ivory/35">Courier</p>
              <p className="mt-0.5 text-ivory/85">Delhivery</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ivory/35">Tracking No.</p>
              <p className="mt-0.5 font-mono text-ivory/85 select-all">60791210000210</p>
            </div>
          </div>

          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold-400/20 bg-gold-400/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gold-200"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Track on Delhivery
          </a>

          <div className="mt-4 rounded-xl border border-gold-400/10 bg-gradient-to-b from-white/[0.03] to-transparent p-3.5 sm:p-4">
            <p className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ivory/35">
              <History className="h-3.5 w-3.5" /> Tracking History
            </p>
            <div className="max-h-72 overflow-y-auto pl-1 pr-1 pt-3">
              {[...scans].reverse().map((scan, i, arr) => {
                const sd = scan.ScanDetail || {};
                const isFirst = i === 0;
                const isLast = i === arr.length - 1;
                const tone = scanTone(sd.Scan);
                const Icon = tone.Icon;
                return (
                  <div key={i} className="relative flex gap-3.5 pb-5 last:pb-0.5">
                    {!isLast && (
                      <span className="absolute left-[10.5px] top-6 h-[calc(100%-1.25rem)] w-px bg-gradient-to-b from-gold-400/20 to-gold-400/5" />
                    )}
                    <span
                      className={`relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${tone.circle} ${
                        isFirst ? "shadow-[0_0_12px_currentColor] scale-110" : "opacity-80"
                      }`}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className={`text-sm font-semibold ${isFirst ? tone.text : "text-ivory/70"}`}>{sd.Scan}</p>
                      {sd.ScannedLocation && <p className="mt-0.5 text-xs text-ivory/40">{sd.ScannedLocation}</p>}
                      {sd.StatusDateTime && (
                        <p className="mt-0.5 text-xs text-ivory/30">{formatScanTime(sd.StatusDateTime)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
