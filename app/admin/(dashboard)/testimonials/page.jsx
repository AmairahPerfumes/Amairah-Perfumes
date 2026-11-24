import { getAllTestimonials } from "@/actions/admin/testimonials";
import TestimonialManager from "./_components/TestimonialManager";

export const metadata = { title: "Testimonials" };

export default async function AdminTestimonialsPage() {
  const testimonials = await getAllTestimonials();

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Home Page <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Testimonials</span>
        </h1>
        <p className="mt-1.5 text-base font-medium text-ivory/65">
          These customer quotes show in the "Customer Voices" carousel on the homepage.
        </p>
      </div>
      <TestimonialManager testimonials={testimonials} />
    </div>
  );
}
