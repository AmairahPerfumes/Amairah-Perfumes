import { getFragranceNotesAdmin } from "@/actions/admin/fragranceNotes";
import FragranceNotesManager from "./_components/FragranceNotesManager";

export const metadata = { title: "Fragrance Notes" };

export default async function AdminFragranceNotesPage() {
  const { notes, missing } = await getFragranceNotesAdmin();

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          Fragrance <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Notes</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-base font-medium text-ivory/65">
          Add an image for each ingredient once. Any product whose Top / Heart / Base notes include that name
          (e.g. &quot;Bergamot&quot;) shows the image automatically. Start with the most-used names below.
        </p>
      </div>
      <FragranceNotesManager notes={notes} missing={missing} />
    </div>
  );
}
