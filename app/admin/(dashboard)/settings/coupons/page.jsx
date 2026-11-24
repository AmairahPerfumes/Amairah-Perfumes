import { getAllCoupons } from "@/actions/admin/coupons";
import CouponsManager from "./_components/CouponsManager";

export const metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  const coupons = await getAllCoupons();

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Discount <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Coupons</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-base font-medium text-ivory/65">
          Discount codes customers can type in at checkout. Create a code, share it, and switch it off or delete it whenever you like.
        </p>
      </div>
      <CouponsManager coupons={coupons} />
    </div>
  );
}
