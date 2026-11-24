import { getShippingSettings } from "@/actions/admin/shipping";
import { isCodEnabled, isOnlinePaymentEnabled } from "@/actions/settings";
import { isRazorpayEnabled } from "@/actions/checkout";
import ShippingForm from "./_components/ShippingForm";

export const metadata = { title: "Shipping Settings" };

export default async function AdminShippingPage() {
  const [shipping, codEnabled, onlineSetting, razorpayConfigured] = await Promise.all([
    getShippingSettings(),
    isCodEnabled(),
    isOnlinePaymentEnabled(),
    isRazorpayEnabled(),
  ]);

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Shipping <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Settings</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-base font-medium text-ivory/65">
          What customers pay for delivery and for Cash on Delivery at checkout, store-wide. Changes apply to new orders straight away.
        </p>
      </div>
      <ShippingForm
        shipping={shipping}
        codEnabled={codEnabled}
        onlineEnabled={Boolean(razorpayConfigured && onlineSetting)}
      />
    </div>
  );
}
