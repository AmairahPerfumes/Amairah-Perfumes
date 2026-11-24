// Server-only Razorpay client factory (keys never leave the server).
export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const Razorpay = require("razorpay");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}
