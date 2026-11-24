import { Users, IndianRupee, Repeat, UserPlus } from "lucide-react";
import { getAllUsers } from "@/actions/admin/users";
import StatStrip from "@/components/admin/StatStrip";
import UsersList from "./_components/UsersList";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  const totalSpend = users.reduce((sum, u) => sum + u.totalSpend, 0);
  const repeatCount = users.filter((u) => u.orderCount > 1).length;
  const newThisMonth = users.filter((u) => {
    const created = new Date(u.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    { label: "Total Users", value: users.length, icon: Users },
    { label: "Total Spend", value: `₹${totalSpend.toLocaleString("en-IN")}`, icon: IndianRupee, tone: "text-gold-200" },
    { label: "Repeat Buyers", value: repeatCount, icon: Repeat, tone: "text-green-300" },
    { label: "New This Month", value: newThisMonth, icon: UserPlus },
  ];

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          All <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Users</span>
        </h1>
        <p className="mt-1.5 text-base font-medium text-ivory/65">
          {users.length} registered user{users.length === 1 ? "" : "s"} — customers and admins.
        </p>
      </div>

      <StatStrip stats={stats} />
      <UsersList users={users} />
    </div>
  );
}
