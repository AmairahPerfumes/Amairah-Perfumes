import { getAllInquiries } from "@/actions/admin/inquiries";
import InquiriesList from "./_components/InquiriesList";

export const metadata = { title: "Inquiries" };

export default async function AdminInquiriesPage() {
  const inquiries = await getAllInquiries();

  return (
    <div>
      {/* Header Panel */}
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Contact <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Inquiries</span>
        </h1>
        <p className="mt-1.5 text-base font-medium text-ivory/65">Messages submitted through the Contact page.</p>
      </div>

      <InquiriesList inquiries={inquiries} />
    </div>
  );
}
