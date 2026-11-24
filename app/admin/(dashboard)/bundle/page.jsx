import { Package, CheckCircle2, PackageX, Radio } from "lucide-react";
import { getBundleSettingsAdmin, getBundleItemsAdmin } from "@/actions/admin/bundle";
import StatStrip from "@/components/admin/StatStrip";
import BundleSettingsForm from "./_components/BundleSettingsForm";
import BundleItemsManager from "./_components/BundleItemsManager";

export const metadata = { title: "Gift Set Builder" };

export default async function AdminBundlePage() {
  const [settings, items] = await Promise.all([getBundleSettingsAdmin(), getBundleItemsAdmin()]);

  const inStockCount = items.filter((i) => (i.stock ?? 0) > 0).length;
  const outOfStockCount = items.length - inStockCount;

  const stats = [
    { label: "Bundle Products", value: items.length, icon: Package },
    { label: "In Stock", value: inStockCount, icon: CheckCircle2, tone: "text-green-300" },
    { label: "Out of Stock", value: outOfStockCount, icon: PackageX, tone: outOfStockCount ? "text-red-300" : "" },
    { label: "Gift Set Page", value: settings.enabled ? "Live" : "Hidden", icon: Radio, tone: settings.enabled ? "text-green-300" : "text-amber-300" },
  ];

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Gift Set{" "}
          <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">
            Builder
          </span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-base font-medium text-ivory/65">
          Let customers pick any number of bottles and build their own gift set on the Gift Set page.
        </p>
      </div>

      <StatStrip stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <BundleSettingsForm settings={settings} />
        <BundleItemsManager items={items} />
      </div>
    </div>
  );
}
