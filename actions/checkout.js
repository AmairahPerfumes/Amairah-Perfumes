"use server";

import { createClient } from "@/lib/supabase/server";
import { SHIPPING_DEFAULTS, calculateQuantityDiscount, calculateBundleDiscount, nonBundleCartQuantity, calculateCodAdvance } from "@/lib/constants";
import { applyRazorpayPayment, isAdvanceOrder } from "@/lib/orderPayments";
import { preorderInfo } from "@/lib/preorder";
import { isCodEnabled, isOnlinePaymentEnabled } from "@/actions/settings";
import { getQuantityDiscountSettings } from "@/actions/admin/quantityDiscount";
import { getBundleSettings } from "@/actions/bundle";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CART_LINES = 50;
const MAX_QTY_PER_LINE = 100;

function cleanText(value, max) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

// Never trust the address the browser sends — same rules the checkout form
// shows, enforced again here.
function cleanAddress(input) {
  const a = {
    fullName: cleanText(input?.fullName, 100),
    phone: cleanText(input?.phone, 10),
    addressLine1: cleanText(input?.addressLine1, 200),
    addressLine2: cleanText(input?.addressLine2, 200),
    city: cleanText(input?.city, 80),
    state: cleanText(input?.state, 80),
    postalCode: cleanText(input?.postalCode, 6),
  };
  if (a.fullName.length < 3 || !/^[a-zA-Z\s.'-]+$/.test(a.fullName)) return { error: "Please enter a valid full name." };
  if (!/^[6-9][0-9]{9}$/.test(a.phone)) return { error: "Please enter a valid 10-digit phone number." };
  if (!a.addressLine1) return { error: "Address is required." };
  if (!a.city) return { error: "City is required." };
  if (!a.state) return { error: "State is required." };
  if (!/^[0-9]{6}$/.test(a.postalCode)) return { error: "Please enter a valid 6-digit PIN code." };
  return { address: a };
}

// The cart comes from the browser, so it is only used to learn WHICH variants
// and HOW MANY. Name, size and — critically — price are re-read from the
// database. Bundle tags are honoured only for variants that really are in the
// admin's bundle list, otherwise anyone could tag arbitrary items to get the
// fixed bundle price.
async function buildTrustedItems(clientItems, bundleSettings) {
  if (!Array.isArray(clientItems) || clientItems.length === 0) return { error: "Your cart is empty." };
  if (clientItems.length > MAX_CART_LINES) return { error: "Too many items in your cart." };

  const lines = new Map();
  for (const raw of clientItems) {
    const variantId = typeof raw?.variantId === "string" ? raw.variantId : "";
    const quantity = Number(raw?.quantity);
    if (!UUID_RE.test(variantId) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      return { error: "Your cart has an invalid item. Please refresh the page and try again." };
    }
    const group = typeof raw.bundleGroupId === "string" && raw.bundleGroupId.length <= 64 ? raw.bundleGroupId : "";
    const key = `${variantId}|${group}`;
    const prev = lines.get(key);
    lines.set(key, { variantId, bundleGroupId: group || null, quantity: (prev?.quantity || 0) + quantity });
  }

  const admin = createAdminClient();
  const variantIds = [...new Set([...lines.values()].map((l) => l.variantId))];

  const { data: variants, error } = await admin
    .from("product_variants")
    .select("id, product_id, variant_name, bottle_type, price, stock_quantity, is_active, products ( name, is_active, preorder_enabled, preorder_advance_amount, preorder_dispatch_date, allow_preorder_oos )")
    .in("id", variantIds);
  if (error || !variants) return { error: "Could not verify your cart. Please try again." };
  const byId = new Map(variants.map((v) => [v.id, v]));

  let bundleVariantIds = new Set();
  if (bundleSettings?.enabled && [...lines.values()].some((l) => l.bundleGroupId)) {
    const { data: bundleRows } = await admin
      .from("bundle_items")
      .select("variant_id")
      .eq("is_active", true)
      .in("variant_id", variantIds);
    bundleVariantIds = new Set((bundleRows || []).map((r) => r.variant_id));
  }

  const totalsPerVariant = new Map();
  for (const l of lines.values()) {
    totalsPerVariant.set(l.variantId, (totalsPerVariant.get(l.variantId) || 0) + l.quantity);
  }

  const preorderOf = (v) => preorderInfo(v.products, v);

  for (const [variantId, qty] of totalsPerVariant) {
    const v = byId.get(variantId);
    if (!v || !v.is_active || !v.products?.is_active) {
      return { error: "An item in your cart is no longer available. Please remove it and try again." };
    }
    // Pre-order items are not limited by ready stock.
    if (preorderOf(v).isPreorder) continue;
    if (v.stock_quantity < qty) {
      const label = `${v.products.name} (${v.variant_name})`;
      return {
        error: v.stock_quantity > 0
          ? `Only ${v.stock_quantity} of ${label} left in stock.`
          : `${label} is out of stock.`,
      };
    }
  }

  const items = [...lines.values()].map((l) => {
    const v = byId.get(l.variantId);
    const pre = preorderOf(v);
    const isBundle = Boolean(l.bundleGroupId) && bundleVariantIds.has(l.variantId) && !pre.isPreorder;
    return {
      variantId: v.id,
      productId: v.product_id,
      name: v.products.name,
      variantName: isBundle
        ? v.variant_name
        : `${v.variant_name} (${v.bottle_type === "plastic" ? "Plastic" : "Glass"})`,
      price: Number(v.price),
      quantity: l.quantity,
      bundleGroupId: isBundle ? l.bundleGroupId : undefined,
      isPreorder: pre.isPreorder,
      advancePerUnit: pre.advance,
      dispatchDate: pre.dispatchDate,
    };
  });

  // A pre-order is paid in two steps while normal items are paid in full, so
  // the two can't share one order.
  const preorderCount = items.filter((i) => i.isPreorder).length;
  if (preorderCount > 0 && preorderCount < items.length) {
    return { error: "Pre-order items must be ordered separately from regular items. Please check out one kind at a time." };
  }

  return { items };
}

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;

  const Razorpay = require("razorpay");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function isRazorpayEnabled() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

async function resolveCoupon(supabase, code, subtotal) {
  if (!code) return { discountAmount: 0, couponCode: null };

  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!coupon) return { error: "Invalid or expired coupon code." };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { error: "This coupon has expired." };
  }
  if (subtotal < Number(coupon.min_purchase)) {
    return { error: `This coupon requires a minimum order of ₹${Number(coupon.min_purchase).toLocaleString("en-IN")}.` };
  }

  const discountAmount =
    coupon.type === "percent"
      ? Math.round((subtotal * Number(coupon.value)) / 100)
      : Number(coupon.value);

  return { discountAmount: Math.min(discountAmount, subtotal), couponCode: coupon.code };
}

export async function validateCoupon(code, subtotal) {
  const supabase = await createClient();
  const result = await resolveCoupon(supabase, code, subtotal);
  if (result.error) return { valid: false, error: result.error };
  return { valid: true, discountAmount: result.discountAmount };
}

export async function processCheckout(addressInput, clientItems, paymentMethod, couponCodeInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please log in to complete checkout.", requiresLogin: true };
  }

  if (paymentMethod !== "COD" && paymentMethod !== "RAZORPAY") {
    return { success: false, error: "Please choose a valid payment method." };
  }

  const cleaned = cleanAddress(addressInput);
  if (cleaned.error) return { success: false, error: cleaned.error };
  const addr = cleaned.address;
  const couponCode = cleanText(couponCodeInput, 40) || null;

  // Prices, names and availability come from the database — see buildTrustedItems.
  const bundleSettings = await getBundleSettings();
  const trusted = await buildTrustedItems(clientItems, bundleSettings);
  if (trusted.error) return { success: false, error: trusted.error };
  const items = trusted.items;

  const hasPreorder = items.some((i) => i.isPreorder);
  if (hasPreorder && paymentMethod !== "RAZORPAY") {
    return { success: false, error: "Pre-orders are paid online (advance now, balance when ready). Please choose online payment." };
  }

  if (paymentMethod === "COD" && !(await isCodEnabled())) {
    return { success: false, error: "Cash on Delivery is currently unavailable. Please pay online instead." };
  }
  if (paymentMethod === "RAZORPAY" && !(await isOnlinePaymentEnabled())) {
    return { success: false, error: "Online payment is currently unavailable. Please choose Cash on Delivery." };
  }

  // 1. Save the shipping address (reuse existing latest address if present)
  const { data: existingAddress } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const addressPayload = {
    user_id: user.id,
    full_name: addr.fullName,
    phone: addr.phone,
    address_line_1: addr.addressLine1,
    address_line_2: addr.addressLine2 || null,
    city: addr.city,
    state: addr.state,
    postal_code: addr.postalCode,
    country: "India",
    is_default: true,
  };

  let addressId;
  if (existingAddress) {
    await supabase.from("addresses").update(addressPayload).eq("id", existingAddress.id);
    addressId = existingAddress.id;
  } else {
    const { data: newAddress, error: addressError } = await supabase
      .from("addresses")
      .insert(addressPayload)
      .select("id")
      .single();
    if (addressError || !newAddress) {
      return { success: false, error: addressError?.message || "Failed to save address." };
    }
    addressId = newAddress.id;
  }

  // 2. Totals
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const { data: settingsRow } = await supabase.from("settings").select("shipping").eq("id", 1).maybeSingle();
  const shipping = settingsRow?.shipping || SHIPPING_DEFAULTS;

  const shippingCost = subtotal >= (shipping.free_threshold ?? SHIPPING_DEFAULTS.free_threshold)
    ? 0
    : shipping.flat_rate ?? SHIPPING_DEFAULTS.flat_rate;
  const codCost = paymentMethod === "COD" ? shipping.cod_charge ?? SHIPPING_DEFAULTS.cod_charge : 0;

  const couponResult = await resolveCoupon(supabase, couponCode, subtotal);
  if (couponResult.error) {
    return { success: false, error: couponResult.error };
  }
  const couponDiscount = couponResult.discountAmount || 0;

  // Automatic discount based on total cart quantity — always recomputed
  // server-side from the live rules, independent of any coupon code.
  const quantityDiscountSettings = await getQuantityDiscountSettings();
  const quantityDiscount = calculateQuantityDiscount(nonBundleCartQuantity(items), quantityDiscountSettings);
  const bundleDiscount = calculateBundleDiscount(items, bundleSettings);

  const discountAmount = couponDiscount + quantityDiscount + bundleDiscount;

  const totalAmount = Math.max(0, subtotal + shippingCost + codCost - discountAmount);

  // COD advance: only when the admin enabled it AND online payment is actually
  // available (the advance is collected through Razorpay). Always computed
  // server-side from the live config — never from anything the client sent.
  let advanceAmount = 0;
  if (paymentMethod === "COD" && shipping.cod_advance?.enabled) {
    if ((await isRazorpayEnabled()) && (await isOnlinePaymentEnabled())) {
      advanceAmount = calculateCodAdvance(totalAmount, shipping.cod_advance);
    }
  }

  // Pre-order: pay the per-bottle advance now (never more than the order is
  // worth); the balance is collected later through a Razorpay Payment Link.
  let preorderBalance = 0;
  let preorderDispatchDate = null;
  if (hasPreorder) {
    const wanted = items.reduce((sum, i) => sum + Math.min(i.advancePerUnit * i.quantity, i.price * i.quantity), 0);
    advanceAmount = Math.min(Math.round(wanted), Math.floor(totalAmount));
    if (advanceAmount <= 0) return { success: false, error: "Could not work out the pre-order advance. Please try again." };
    preorderBalance = Math.max(0, totalAmount - advanceAmount);
    // Latest expected dispatch among the pre-ordered items.
    preorderDispatchDate = items.map((i) => i.dispatchDate).filter(Boolean).sort().pop() || null;
  }

  const orderNumber = `AMR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      address_id: addressId,
      subtotal,
      shipping_cost: shippingCost + codCost,
      discount_amount: discountAmount,
      coupon_discount: couponDiscount,
      quantity_discount: quantityDiscount,
      bundle_discount: bundleDiscount,
      coupon_code: couponResult.couponCode || null,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: "pending",
      order_status: "pending",
      // Only sent when an advance applies, so plain orders don't depend on
      // the advance columns existing.
      ...(advanceAmount > 0 ? { advance_amount: advanceAmount, advance_status: "pending" } : {}),
      ...(hasPreorder
        ? {
            is_preorder: true,
            balance_amount: preorderBalance,
            balance_status: preorderBalance > 0 ? "waiting" : "none",
            expected_dispatch_date: preorderDispatchDate,
          }
        : {}),
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    return { success: false, error: orderError?.message || "Failed to create order." };
  }

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    variant_id: item.variantId,
    product_name: item.name,
    variant_name: item.variantName,
    price_at_purchase: item.price,
    quantity: item.quantity,
    line_total: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) {
    return { success: false, error: "Failed to save order items." };
  }

  if (paymentMethod === "RAZORPAY" || advanceAmount > 0) {
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return { success: false, error: "Online payments are not configured yet. Please choose Cash on Delivery." };
    }
    try {
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round((advanceAmount > 0 ? advanceAmount : totalAmount) * 100),
        currency: "INR",
        receipt: order.id,
        notes: { internal_order_id: order.id },
      });
      // orders has no UPDATE RLS policy for the customer session (only
      // SELECT/INSERT of their own rows) — same class of bug as the stock
      // decrement below, same fix: route it through the service-role client.
      await createAdminClient().from("orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);

      return {
        success: true,
        isRazorpay: true,
        razorpayOrderId: rzpOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        orderNumber: order.order_number,
        amount: rzpOrder.amount,
        ...(advanceAmount > 0
          ? {
              isCodAdvance: paymentMethod === "COD",
              isPreorder: hasPreorder,
              advanceAmount,
              codBalance: Math.max(0, totalAmount - advanceAmount),
              dispatchDate: preorderDispatchDate,
            }
          : {}),
      };
    } catch (e) {
      const reason = e?.error?.description || e?.message || "Unknown error";
      console.error("Razorpay order creation failed:", e?.error || e);
      return { success: false, error: `Failed to start online payment: ${reason}` };
    }
  }

  // product_variants only has a public read RLS policy — no update policy
  // for the customer's own session — so this must run with the service-role
  // client, same as the Razorpay path below already does.
  await decrementStock(createAdminClient(), items);

  return { success: true, isRazorpay: false, orderId: order.id, orderNumber: order.order_number };
}

export async function verifyRazorpayPayment(razorpayPaymentId, razorpayOrderId, razorpaySignature, internalOrderId, items) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return { success: false, error: "Razorpay is not configured." };

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return { success: false, error: "Payment verification failed." };
  }

  const admin = createAdminClient();

  // Stock/amount come from the saved order, not from anything the browser sends.
  const { data: order } = await admin
    .from("orders")
    .select("id, payment_method, advance_amount, is_preorder, balance_amount, razorpay_order_id, order_items(variant_id, quantity)")
    .eq("id", internalOrderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) return { success: false, error: "Order not found." };
  // The signature proves this payment belongs to razorpayOrderId; make sure
  // that Razorpay order is the one created for THIS order.
  if (order.razorpay_order_id !== razorpayOrderId) {
    return { success: false, error: "Payment does not match this order." };
  }

  const applied = await applyRazorpayPayment(admin, order, razorpayPaymentId);
  if (!applied.ok) return { success: false, error: "Payment received but the order could not be updated. Please contact support." };

  return { success: true, razorpayPaymentId, isAdvance: isAdvanceOrder(order) };
}

async function decrementStock(client, items) {
  for (const item of items) {
    if (!item.variantId) continue;
    const { data: variant } = await client
      .from("product_variants")
      .select("stock_quantity")
      .eq("id", item.variantId)
      .maybeSingle();
    if (variant) {
      await client
        .from("product_variants")
        .update({ stock_quantity: Math.max(0, variant.stock_quantity - item.quantity) })
        .eq("id", item.variantId);
    }
  }
}
