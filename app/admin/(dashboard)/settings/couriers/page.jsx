import { getCouriersAdmin } from "@/actions/admin/couriers";
import CouriersManager from "./_components/CouriersManager";

export const metadata = { title: "Courier Partners" };

export default async function AdminCouriersPage() {
  const couriers = await getCouriersAdmin();

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Courier <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Partners</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-base font-medium text-ivory/65">
          The couriers you can choose when you add tracking by hand on an order — e.g. India Post, DTDC. Customers see the
          courier name, the tracking ID and a &quot;Track&quot; button if you add a tracking link.
        </p>
      </div>
      <CouriersManager couriers={couriers} />
    </div>
  );
}
