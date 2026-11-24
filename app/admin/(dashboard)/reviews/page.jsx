import { getAllReviewsAdmin } from "@/actions/admin/reviews";
import ReviewList from "./_components/ReviewList";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsAdmin();

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Customer <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Reviews</span>
        </h1>
        <p className="mt-1.5 text-base font-medium text-ivory/65">
          New reviews wait here until you approve them — only approved reviews appear on product pages.
        </p>
      </div>

      <ReviewList reviews={reviews} />
    </div>
  );
}
