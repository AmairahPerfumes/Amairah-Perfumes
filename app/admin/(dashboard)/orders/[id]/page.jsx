import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, MapPin, CreditCard } from "lucide-react";
import { getOrderById } from "@/actions/admin/orders";
import OrderStatusManager from "./_components/OrderStatusManager";
import DelhiveryShipmentManager from "./_components/DelhiveryShipmentManager";
import ManualShipmentManager from "./_components/ManualShipmentManager";
import PreorderManager from "./_components/PreorderManager";
import { getCouriersAdmin } from "@/actions/admin/couriers";
import BottleGlyph from "@/components/BottleGlyph";
import { orderAmounts } from "@/lib/orderAmounts";

export const metadata = { title: "Order Detail" };

const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-6 backdrop-blur-md md:p-8";

export default async function AdminOrderDetailPage({ params }) {
  const { id } = await params;
  const [order, couriers] = await Promise.all([getOrderById(id), getCouriersAdmin()]);
  if (!order) notFound();

  const address = order.addresses;
  const amounts = orderAmounts(order);

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ivory/40 transition-colors hover:text-gold-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold-400/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-light text-ivory">
            Order <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">{order.order_number}</span>
          </h1>
          <p className="mt-1 text-sm text-ivory/50">Placed {new Date(order.created_at).toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="min-w-0 space-y-6">
          <div className={panelClass}>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
                <Package className="h-4 w-4" />
              </div>
              <h2 className="font-display text-lg text-ivory">Items</h2>
            </div>
            <ul className="mt-4 divide-y divide-gold-400/5">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gold-400/10 bg-ink-soft">
                    {item.products?.featured_image_url ? (
                      <Image src={item.products.featured_image_url} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BottleGlyph className="h-7 w-auto text-ivory/20" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ivory">{item.product_name}</p>
                    <p className="text-ivory/40">{item.variant_name} × {item.quantity}</p>
                  </div>
                  <span className="shrink-0 font-medium text-ivory">₹{Number(item.line_total).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 border-t border-gold-400/10 pt-4 text-sm">
              <div className="flex justify-between text-ivory/60">
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-ivory/60">
                <span>Shipping</span>
                <span>₹{Number(order.shipping_cost).toLocaleString("en-IN")}</span>
              </div>
              {order.quantity_discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Bulk Discount</span>
                  <span>-₹{Number(order.quantity_discount).toLocaleString("en-IN")}</span>
                </div>
              )}
              {order.coupon_discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Coupon{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
                  <span>-₹{Number(order.coupon_discount).toLocaleString("en-IN")}</span>
                </div>
              )}
              {order.bundle_discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Bundle Discount</span>
                  <span>-₹{Number(order.bundle_discount).toLocaleString("en-IN")}</span>
                </div>
              )}
              {order.quantity_discount === 0 && order.coupon_discount === 0 && order.bundle_discount === 0 && order.discount_amount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
                  <span>-₹{Number(order.discount_amount).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gold-400/10 pt-2 font-display text-base text-ivory">
                <span>Total</span>
                <span className="text-gold-200">₹{Number(order.total_amount).toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-2 space-y-1.5 rounded-xl border border-gold-400/15 bg-gold-400/5 px-3.5 py-3">
                <div className="flex justify-between text-ivory/70">
                  <span>{amounts.paidLabel}</span>
                  <span className={amounts.paid > 0 ? "font-semibold text-green-300" : "font-semibold text-ivory/50"}>
                    ₹{amounts.paid.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gold-400/10 pt-1.5 text-ivory">
                  <span>{amounts.dueLabel}</span>
                  <span className={amounts.due > 0 ? "font-semibold text-amber-300" : "font-semibold text-green-300"}>
                    ₹{amounts.due.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
                <MapPin className="h-4 w-4" />
              </div>
              <h2 className="font-display text-lg text-ivory">Customer &amp; Shipping</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-ivory/40">Customer</p>
                <p className="mt-1.5 text-ivory">{order.profiles?.full_name}</p>
                <p className="text-ivory/50">{order.profiles?.email}</p>
                <p className="text-ivory/50">{order.profiles?.phone}</p>
              </div>
              {address && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-ivory/40">Shipping Address</p>
                  <p className="mt-1.5 text-ivory">{address.full_name} · {address.phone}</p>
                  <p className="text-ivory/50">{address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ""}</p>
                  <p className="text-ivory/50">{address.city}, {address.state} {address.postal_code}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`${panelClass} h-fit min-w-0`}>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
              <CreditCard className="h-4 w-4" />
            </div>
            <h2 className="font-display text-lg text-ivory">Manage Status</h2>
          </div>
          <OrderStatusManager order={order} />
          <p className="mt-5 text-sm text-ivory/40">
            Payment method: <span className="text-ivory/70">{order.is_preorder ? "Pre-Order (Razorpay: advance + balance)" : order.payment_method === "COD" ? "Cash on Delivery" : "Online (Razorpay)"}</span>
          </p>
          {order.payment_method === "COD" && !order.is_preorder && Number(order.advance_amount) > 0 && (
            <div className="mt-4 space-y-1.5 rounded-xl border border-gold-400/15 bg-gold-400/5 p-3.5 text-sm">
              <div className="flex justify-between text-ivory/70">
                <span>Advance ({order.advance_status})</span>
                <span className={order.advance_status === "paid" ? "font-semibold text-green-300" : "font-semibold text-amber-300"}>
                  ₹{Number(order.advance_amount).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between border-t border-gold-400/10 pt-1.5 text-ivory">
                <span>Collect on delivery</span>
                <span className="font-semibold text-gold-200">
                  ₹{Math.max(0, Number(order.total_amount) - (order.advance_status === "paid" ? Number(order.advance_amount) : 0)).toLocaleString("en-IN")}
                </span>
              </div>
              {order.advance_status !== "paid" && (
                <p className="pt-1 text-xs text-amber-300/80">Advance not received yet — don&apos;t ship until it&apos;s paid.</p>
              )}
            </div>
          )}
          {(order.payment_method === "RAZORPAY" || Number(order.advance_amount) > 0) && order.razorpay_payment_id && (
            <div className="mt-4 border-t border-gold-400/10 pt-4 text-xs">
              <span className="block text-ivory/40 uppercase tracking-wider font-semibold">Razorpay Payment ID</span>
              <span className="font-mono text-ivory/80 select-all">{order.razorpay_payment_id}</span>
            </div>
          )}
          {order.is_preorder && <PreorderManager order={order} />}
          {order.is_preorder && Number(order.balance_amount) > 0 && order.balance_status !== "paid" && !order.tracking_number ? (
            <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200/80">
              Shipping is locked until the pre-order balance is paid.
            </p>
          ) : order.is_manual_shipment ? (
            <ManualShipmentManager order={order} couriers={couriers} />
          ) : (
            <>
              <DelhiveryShipmentManager order={order} />
              {!order.tracking_number && <ManualShipmentManager order={order} couriers={couriers} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
