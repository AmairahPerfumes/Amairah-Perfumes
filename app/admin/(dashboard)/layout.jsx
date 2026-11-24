import { headers } from "next/headers";
import { AdminSidebarProvider } from "@/context/AdminSidebarContext";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/Header";

// Admin-only styling (this layout unmounts when you leave the admin, so the
// customer site is untouched):
//  - root text a notch larger (17px instead of 16px; everything is sized in rem)
//  - small helper/hint paragraphs (text-xs / 11px / 10px) bigger and medium weight
//  - very faint grey helper text and labels (ivory 25-45% opacity) brighter and easier to read
const ADMIN_CSS = `
html{font-size:106.25%}
.admin-ui p[class~="text-xs"]:not([class*="uppercase"]),
.admin-ui p[class*="text-[11px]"]:not([class*="uppercase"]),
.admin-ui p[class*="text-[10px]"]:not([class*="uppercase"]){font-size:.875rem;line-height:1.35rem;font-weight:500}
.admin-ui p[class~="text-sm"][class*="text-ivory/"]{font-weight:500}
.admin-ui p[class*="text-ivory/25"],
.admin-ui p[class*="text-ivory/30"],
.admin-ui p[class*="text-ivory/35"]{color:rgb(247 243 234 / .55)}
.admin-ui p[class*="text-ivory/40"],
.admin-ui p[class*="text-ivory/45"]{color:rgb(247 243 234 / .65)}
.admin-ui label[class*="text-ivory/30"],
.admin-ui label[class*="text-ivory/40"]{color:rgb(247 243 234 / .65)}
.admin-ui label[class~="text-xs"]{font-size:.8125rem}
`;

export const metadata = {
  title: { template: "%s — Amairah Admin", default: "Admin Dashboard" },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({ children }) {
  // Identity is already verified by middleware for every route under this
  // layout — reading its header avoids a second Supabase auth round trip.
  const headerList = await headers();
  const encodedName = headerList.get("x-admin-name");
  const adminName = encodedName ? decodeURIComponent(encodedName) : "Admin";

  // Badge counts are fetched client-side by the sidebar itself (see
  // Sidebar.jsx) instead of being awaited here — they're non-critical nav
  // decoration and shouldn't block every admin page's initial render.

  return (
    <AdminSidebarProvider>
      {/* Admin-only: everything is sized in rem, so nudging the root size makes all
          admin text a little larger (17px instead of 16px). It disappears with this
          layout, so the customer site is unaffected. */}
      <style>{ADMIN_CSS}</style>
      <div className="admin-ui flex h-screen overflow-hidden bg-ink">
        <AdminSidebar adminName={adminName} />
        <div className="flex h-screen flex-1 flex-col overflow-hidden lg:pl-0">
          <AdminHeader adminName={adminName} />
          <main className="relative flex-1 overflow-y-auto p-4 md:p-8">
            <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_1200px_600px_at_top,rgba(202,161,75,0.05),transparent_60%)]" />
            {children}
          </main>
        </div>
      </div>
    </AdminSidebarProvider>
  );
}
