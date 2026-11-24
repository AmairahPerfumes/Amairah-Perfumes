"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Save, CalendarClock } from "lucide-react";
import { createProduct, updateProduct } from "@/actions/admin/products";
import ImageUploader from "@/components/admin/ImageUploader";
import VariantsEditor from "./VariantsEditor";
import SizeImageMapper from "./SizeImageMapper";
import FaqsEditor from "./FaqsEditor";
import NotesInput from "./NotesInput";
import { GENDERS } from "@/lib/constants";
import { validateVariants } from "@/lib/productValidation";
import FilterSelect from "@/components/admin/FilterSelect";

const inputClass =
  "w-full rounded-2xl border border-gold-400/10 bg-ink/40 px-5 py-3.5 text-sm text-ivory placeholder:text-ivory/20 transition-all duration-500 focus:border-gold-300/50 focus:bg-ink/70 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20";
const FIELD_SELECT =
  "rounded-2xl border border-gold-400/10 bg-ink/40 px-5 py-3.5 text-sm text-ivory hover:border-gold-400/20";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-widest text-gold-300/85";
const panelClass =
  "relative rounded-[2.5rem] border border-gold-400/10 bg-gradient-to-b from-[#120f0d]/95 via-[#0b0a0a]/95 to-[#080707]/98 p-6 sm:p-8 space-y-5 backdrop-blur-xl shadow-xl";


export default function ProductForm({ product, categories, noteSuggestions = [] }) {
  const isEditing = !!product;
  const action = isEditing ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, {});
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [preorderEnabled, setPreorderEnabled] = useState(product?.preorder_enabled ?? false);
  const [allowPreorderOos, setAllowPreorderOos] = useState(product?.allow_preorder_oos ?? false);

  const [featuredImage, setFeaturedImage] = useState(product?.featured_image_url || null);
  const [gallery, setGallery] = useState(
    (product?.product_images || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ url: i.image_url, size: i.variant_name || null }))
  );
  const [variants, setVariants] = useState(
    product?.product_variants?.length
      ? product.product_variants.map((v) => ({ ...v, bottle_type: v.bottle_type === "plastic" ? "plastic" : "glass", price: String(v.price), original_price: v.original_price ? String(v.original_price) : "", stock_quantity: String(v.stock_quantity) }))
      : [{ variant_name: "", bottle_type: "glass", price: "", original_price: "", stock_quantity: "" }]
  );
  const [faqs, setFaqs] = useState(product?.product_faqs?.map((f) => ({ question: f.question, answer: f.answer })) || []);
  const [showVariantErrors, setShowVariantErrors] = useState(false);
  const variantError = showVariantErrors ? validateVariants(variants) : null;

  const handleSubmit = (e) => {
    if (validateVariants(variants)) {
      e.preventDefault();
      setShowVariantErrors(true);
      document.getElementById("variants-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="featured_image_url" value={featuredImage || ""} />
      <input type="hidden" name="images" value={JSON.stringify(gallery)} />
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />
      <input type="hidden" name="is_active" value={isActive ? "on" : "off"} />
      <input type="hidden" name="is_featured" value={isFeatured ? "on" : "off"} />
      <input type="hidden" name="preorder_enabled" value={preorderEnabled ? "on" : "off"} />
      <input type="hidden" name="allow_preorder_oos" value={allowPreorderOos ? "on" : "off"} />

      {(variantError || state.error) && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse shrink-0" />
          {variantError || state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className={panelClass}>
            <h2 className="font-display text-base text-ivory">Basic Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Product Name</label>
                <input required name="name" defaultValue={product?.name} placeholder="e.g. Oudh Mustaqeem Attar" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <FilterSelect
                  name="category_id"
                  defaultValue={product?.category_id || ""}
                  buttonClassName={FIELD_SELECT}
                  options={[{ value: "", label: "Select a category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                />
              </div>
              <div>
                <label className={labelClass}>For</label>
                <FilterSelect
                  name="gender"
                  defaultValue={product?.gender || ""}
                  buttonClassName={FIELD_SELECT}
                  options={[{ value: "", label: "Select" }, ...GENDERS.map((g) => ({ value: g, label: g }))]}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Short Description</label>
              <textarea name="short_description" rows={2} defaultValue={product?.short_description} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelClass}>Top Notes</label>
                <NotesInput name="notes_top" defaultValue={product?.notes_top} placeholder="Saffron, Bergamot" className={inputClass} suggestions={noteSuggestions} />
              </div>
              <div>
                <label className={labelClass}>Heart Notes</label>
                <NotesInput name="notes_middle" defaultValue={product?.notes_middle} placeholder="Rose, Oudh" className={inputClass} suggestions={noteSuggestions} />
              </div>
              <div>
                <label className={labelClass}>Base Notes</label>
                <NotesInput name="notes_base" defaultValue={product?.notes_base} placeholder="Amber, Musk" className={inputClass} suggestions={noteSuggestions} />
              </div>
            </div>
            <p className="-mt-3 text-xs text-ivory/40">
              Separate ingredients with commas — start typing to pick from saved ingredients. Images for each ingredient are managed in{" "}
              <a href="/admin/fragrance-notes" target="_blank" className="text-gold-300 underline-offset-2 hover:underline">
                Fragrance Notes
              </a>.
            </p>

            <div>
              <label className={labelClass}>Full Description</label>
              <textarea name="description" rows={8} defaultValue={product?.description} className={inputClass} />
            </div>
          </div>

          <div id="variants-section" className={panelClass}>
            <h2 className="font-display text-base text-ivory">Bottle Sizes &amp; Pricing</h2>
            <VariantsEditor variants={variants} onChange={setVariants} showErrors={showVariantErrors} />
          </div>

          <div className={panelClass}>
            <h2 className="font-display text-base text-ivory">FAQs</h2>
            <FaqsEditor faqs={faqs} onChange={setFaqs} />
          </div>

          <div className={panelClass}>
            <h2 className="font-display text-base text-ivory">SEO</h2>
            <div>
              <label className={labelClass}>SEO Title</label>
              <input name="seo_title" maxLength={60} defaultValue={product?.seo_title} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>SEO Description</label>
              <textarea name="seo_description" rows={3} maxLength={160} defaultValue={product?.seo_description} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={panelClass}>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-gold-300" />
              <h2 className="font-display text-base text-ivory">Pre-Order</h2>
            </div>
            <p className="text-xs text-ivory/40">
              Customers pay only the advance now and the balance when you mark the order ready. Stock is set per bottle size above.
            </p>
            <button
              type="button"
              onClick={() => setPreorderEnabled((v) => !v)}
              className={`flex w-full items-center justify-between rounded-2xl border px-5 py-3.5 text-sm transition-all duration-500 ${
                preorderEnabled ? "border-gold-400/30 bg-gold-400/10 text-gold-200" : "border-gold-400/10 bg-ink/40 text-ivory/40"
              }`}
            >
              {preorderEnabled ? "Pre-Order is ON" : "Enable Pre-Order"}
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-500 ${preorderEnabled ? "bg-gold-400" : "bg-ivory/10"}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-500 ${preorderEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </span>
            </button>
            <div>
              <label className={labelClass}>Advance (₹ / bottle)</label>
              <input
                type="number"
                min="0"
                name="preorder_advance_amount"
                defaultValue={product?.preorder_advance_amount || ""}
                placeholder="e.g. 150"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Expected Dispatch Date</label>
              <input
                type="date"
                name="preorder_dispatch_date"
                defaultValue={product?.preorder_dispatch_date || ""}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => setAllowPreorderOos((v) => !v)}
              className={`flex w-full items-center justify-between rounded-2xl border px-5 py-3.5 text-sm transition-all duration-500 ${
                allowPreorderOos ? "border-gold-400/30 bg-gold-400/10 text-gold-200" : "border-gold-400/10 bg-ink/40 text-ivory/40"
              }`}
            >
              Pre-order when out of stock
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-500 ${allowPreorderOos ? "bg-gold-400" : "bg-ivory/10"}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-500 ${allowPreorderOos ? "translate-x-5" : "translate-x-0"}`} />
              </span>
            </button>
          </div>

          <div className={panelClass}>
            <h2 className="font-display text-base text-ivory">Status</h2>
            <div>
              <label className={labelClass}>Badge</label>
              <input
                name="badge"
                defaultValue={product?.badge || ""}
                placeholder="e.g. New, Bestseller"
                maxLength={30}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`flex w-full items-center justify-between rounded-2xl border px-5 py-3.5 text-sm transition-all duration-500 ${
                isActive ? "border-green-400/20 bg-green-500/10 text-green-300" : "border-gold-400/10 bg-ink/40 text-ivory/40"
              }`}
            >
              {isActive ? "Visible in store" : "Hidden"}
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-500 ${isActive ? "bg-green-500" : "bg-ivory/10"}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-500 ${isActive ? "translate-x-5" : "translate-x-0"}`} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsFeatured((v) => !v)}
              className={`flex w-full items-center justify-between rounded-2xl border px-5 py-3.5 text-sm transition-all duration-500 ${
                isFeatured ? "border-gold-400/20 bg-gold-400/10 text-gold-200" : "border-gold-400/10 bg-ink/40 text-ivory/40"
              }`}
            >
              Featured on homepage
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-500 ${isFeatured ? "bg-gold-500" : "bg-ivory/10"}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-500 ${isFeatured ? "translate-x-5" : "translate-x-0"}`} />
              </span>
            </button>
          </div>

          <div className={panelClass}>
            <h2 className="font-display text-base text-ivory">Featured Image</h2>
            <ImageUploader value={featuredImage} onChange={setFeaturedImage} folder="amairah/products" />
          </div>

          <div className={panelClass}>
            <h2 className="font-display text-base text-ivory">Gallery Images</h2>
            <SizeImageMapper images={gallery} onChange={setGallery} variants={variants} folder="amairah/products" />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-center gap-4 border-t border-gold-400/10 pt-6 sm:flex-row sm:justify-between">
        <Link href="/admin/products" className="text-sm text-ivory/50 hover:text-ivory">Cancel</Link>
        <button type="submit" disabled={pending} className="btn-gold w-full disabled:opacity-60 sm:w-auto">
          <Save className="h-4 w-4" /> {pending ? "Saving…" : isEditing ? "Update Product" : "Create Product"}
        </button>
      </div>
    </form>
  );
}
