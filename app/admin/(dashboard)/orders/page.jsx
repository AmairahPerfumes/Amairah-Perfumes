import { ShoppingCart, Clock, Truck, XCircle } from "lucide-react";
import { getAllOrdersAdmin } from "@/actions/admin/orders";
import StatStrip from "@/components/admin/StatStrip";
import OrdersList from "./_components/OrdersList";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const orders = await getAllOrdersAdmin();

  const count = (status) => orders.filter((o) => o.order_status === status).length;
  const pendingCount = count("pending");
  const shippedCount = count("shipped");
  const cancelledCount = count("cancelled");

  const stats = [
    { label: "Total Orders", value: orders.length, icon: ShoppingCart },
    { label: "Pending", value: pendingCount, icon: Clock, tone: pendingCount ? "text-amber-300" : "" },
    { label: "Shipped", value: shippedCount, icon: Truck, tone: "text-blue-300" },
    { label: "Cancelled", value: cancelledCount, icon: XCircle, tone: cancelledCount ? "text-red-300" : "" },
  ];

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Order <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Management</span>
        </h1>
        <p className="mt-1.5 text-base font-medium text-ivory/65">
          {orders.length} order{orders.length === 1 ? "" : "s"} placed so far. Open an order to update its status or add tracking.
        </p>
      </div>

      <StatStrip stats={stats} />
      <OrdersList orders={orders} />
    </div>
  );
}
