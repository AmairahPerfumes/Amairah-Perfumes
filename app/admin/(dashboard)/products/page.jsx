import Link from "next/link";
import { Plus, Package, CheckCircle2, PackageX, AlertTriangle } from "lucide-react";
import { getAllProductsAdmin } from "@/actions/admin/products";
import StatStrip from "@/components/admin/StatStrip";
import ProductsList from "./_components/ProductsList";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const products = await getAllProductsAdmin();

  const activeCount = products.filter((p) => p.is_active).length;
  const outOfStockCount = products.filter((p) => p.totalStock === 0).length;
  const lowStockCount = products.filter((p) => p.totalStock > 0 && p.totalStock <= 5).length;

  const stats = [
    { label: "Total Products", value: products.length, icon: Package },
    { label: "Active", value: activeCount, icon: CheckCircle2, tone: "text-green-300" },
    { label: "Low Stock (5 or less)", value: lowStockCount, icon: AlertTriangle, tone: lowStockCount ? "text-amber-300" : "" },
    { label: "Out of Stock", value: outOfStockCount, icon: PackageX, tone: outOfStockCount ? "text-red-300" : "" },
  ];

  return (
    <div>
      {/* Header Panel */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gold-400/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-light text-ivory">
            Manage <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Products</span>
          </h1>
          <p className="mt-1.5 text-base font-medium text-ivory/65">
            {products.length} product{products.length === 1 ? "" : "s"} in your catalogue.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="btn-gold group flex w-full items-center justify-center gap-1.5 px-6 py-3.5 text-xs font-semibold tracking-widest uppercase shadow-[0_4px_15px_rgba(212,163,89,0.12)] hover:shadow-[0_4px_20px_rgba(212,163,89,0.25)] hover:-translate-y-0.5 transition-all duration-300 sm:w-auto"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" /> New Product
        </Link>
      </div>

      <StatStrip stats={stats} />

      <ProductsList products={products} />
    </div>
  );
}
