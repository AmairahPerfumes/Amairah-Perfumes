import { getQuantityDiscountSettings } from "@/actions/admin/quantityDiscount";
import QuantityDiscountForm from "./_components/QuantityDiscountForm";

export const metadata = { title: "Quantity Discount Settings" };

export default async function AdminQuantityDiscountPage() {
  const settings = await getQuantityDiscountSettings();

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Quantity{" "}
          <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">
            Discount
          </span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-base font-medium text-ivory/65">
          An automatic discount that grows with the number of bottles in the cart. It applies store-wide — customers don&apos;t need a coupon code.
        </p>
      </div>
      <QuantityDiscountForm settings={settings} />
    </div>
  );
}
