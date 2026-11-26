"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Star, X } from "lucide-react";
import { IMAGE_ACCEPT, useImageUpload } from "@/components/admin/useImageUpload";

/**
 * `value` is either a single URL string (multiple=false) or an array of URL
 * strings (multiple=true). `onChange` receives the same shape back.
 *
 * When `multiple` and `showCoverPicker` are both set, the first image in the
 * array is treated as the "cover" — each other thumbnail gets a star button
 * that promotes it to index 0.
 */
export default function ImageUploader({
  value,
  onChange,
  multiple = false,
  folder = "amairah",
  previewClassName = "h-24 w-24",
  showCoverPicker = false,
}) {
  const urls = multiple ? value || [] : value ? [value] : [];
  const { upload, overlay, error, note } = useImageUpload();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // An upload outlives the render it started in, so it must read the latest
  // value/onChange — otherwise each file would overwrite the previous one.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleUploaded = (url) => {
    if (multiple) {
      // Update the ref synchronously too, so the next file appends onto this one
      // even if React hasn't re-rendered yet.
      const next = [...(valueRef.current || []), url];
      valueRef.current = next;
      onChangeRef.current(next);
    } else {
      onChangeRef.current(url);
    }
  };

  const startUpload = (files) => {
    const list = Array.from(files || []);
    upload(multiple ? list : list.slice(0, 1), folder, handleUploaded);
  };

  const removeAt = (idx) => {
    if (multiple) onChange((value || []).filter((_, i) => i !== idx));
    else onChange(null);
  };

  const setCover = (idx) => {
    if (idx === 0) return;
    const rest = urls.filter((_, i) => i !== idx);
    onChange([urls[idx], ...rest]);
  };

  const showCover = multiple && showCoverPicker && urls.length > 1;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {urls.map((url, idx) => (
          <div key={url} className={`relative overflow-hidden rounded-xl border ${idx === 0 && showCover ? "border-gold-400/60" : "border-ink-line"} ${previewClassName}`}>
            <Image src={url} alt="" fill sizes="(max-width: 640px) 100vw, 448px" className="object-cover" />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3 w-3" />
            </button>
            {showCover && (
              <button
                type="button"
                onClick={() => setCover(idx)}
                disabled={idx === 0}
                title={idx === 0 ? "Cover image" : "Set as cover image"}
                className={`absolute bottom-1 left-1 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide backdrop-blur-sm ${
                  idx === 0 ? "bg-gold-gradient text-ink" : "bg-black/60 text-ivory/80 hover:text-gold-300"
                }`}
              >
                <Star className={`h-2.5 w-2.5 ${idx === 0 ? "fill-ink" : ""}`} />
                {idx === 0 ? "Cover" : "Set"}
              </button>
            )}
          </div>
        ))}

        {(multiple || urls.length === 0) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              startUpload(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors hover:border-gold-400/50 hover:text-gold-300 ${
              dragging ? "border-gold-400/70 bg-gold-400/10 text-gold-300" : "border-ink-line text-ivory/40"
            } ${previewClassName}`}
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px]">Upload</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          startUpload(e.target.files);
          e.target.value = ""; // lets the same file be picked again
        }}
      />

      {error && <p className="mt-2 text-sm font-medium text-red-400">Upload failed — {error}</p>}
      {note && <p className="mt-2 text-sm font-medium text-green-300">{note}</p>}
      {overlay}
    </div>
  );
}
