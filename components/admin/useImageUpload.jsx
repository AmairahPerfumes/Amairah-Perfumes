"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { compressImage } from "@/components/admin/compressImage";

const UPLOAD_URL = "https://upload.imagekit.io/api/v2/files/upload";
// Mirrors lib/imagekitToken.js — checked here only to fail fast with a clear
// message; the server and ImageKit enforce the real limits.
const MAX_BYTES = 10 * 1024 * 1024; // what may be stored
const MAX_INPUT_BYTES = 40 * 1024 * 1024; // what may be picked, before compression
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

const readableSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

async function readJson(res) {
  return res.json().catch(() => ({}));
}

async function uploadOne(file, folder, signal) {
  if (!IMAGE_ACCEPT.split(",").includes(file.type)) throw new Error("only JPG, PNG, WEBP, AVIF or GIF images are allowed");
  if (file.size > MAX_INPUT_BYTES) throw new Error("image is larger than 40 MB");
  const ready = await compressImage(file, folder);
  if (ready.size > MAX_BYTES) throw new Error("image is larger than 10 MB");

  const auth = await fetch("/api/imagekit/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: ready.name, fileType: ready.type, folder }),
    signal,
  });
  const signed = await readJson(auth);
  if (!auth.ok) throw new Error(auth.status === 401 ? "please sign in again" : signed.error || "could not start the upload");

  const form = new FormData();
  form.append("file", ready, signed.fields.fileName);
  form.append("token", signed.token);
  Object.entries(signed.fields).forEach(([key, value]) => form.append(key, value));

  const res = await fetch(UPLOAD_URL, { method: "POST", body: form, signal });
  const result = await readJson(res);
  if (!res.ok || !result.url) throw new Error(result.message || "upload failed");
  return { url: result.url, storedBytes: ready.size };
}

/**
 * Uploads images to ImageKit one after another.
 *
 *   const { upload, overlay, error, note } = useImageUpload();
 *   upload(files, "amairah/products", (url, file) => …);
 *
 * Images are compressed in the browser first; `note` says how much that saved.
 * Render `overlay` somewhere: it blocks the page while files are going up, so a
 * form can't be saved (or a tab switched) before the images have arrived.
 */
export function useImageUpload() {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const upload = useCallback(async (fileList, folder, onEach) => {
    const files = Array.from(fileList || []);
    if (!files.length || abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setNote("");
    document.activeElement?.blur?.();
    const failed = [];
    let pickedBytes = 0;
    let storedBytes = 0;

    for (let i = 0; i < files.length; i++) {
      if (controller.signal.aborted) break;
      setProgress({ current: i + 1, total: files.length });
      try {
        const done = await uploadOne(files[i], folder, controller.signal);
        if (controller.signal.aborted) break;
        pickedBytes += files[i].size;
        storedBytes += done.storedBytes;
        onEach(done.url, files[i]);
      } catch (e) {
        if (controller.signal.aborted) break;
        const reason = e instanceof TypeError ? "network error" : e.message;
        failed.push(`${files[i].name}: ${reason}`);
      }
    }

    abortRef.current = null;
    setProgress(null);
    if (failed.length) setError(failed.join(" · "));
    if (storedBytes < pickedBytes) setNote(`Compressed ${readableSize(pickedBytes)} → ${readableSize(storedBytes)}`);
  }, []);

  const overlay =
    progress && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div role="alertdialog" aria-label="Uploading images" className="w-full max-w-xs rounded-2xl border border-gold-400/20 bg-ink-soft p-6 text-center shadow-2xl">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-gold-300" />
              <p className="mt-3 text-base font-semibold text-ivory">
                {progress.total > 1 ? `Uploading ${progress.current} of ${progress.total}…` : "Uploading image…"}
              </p>
              <p className="mt-1 text-sm text-ivory/55">Compressing to save space</p>
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="mt-4 rounded-xl border border-gold-400/15 px-4 py-2 text-sm font-semibold text-ivory/70 transition-colors hover:border-gold-400/35 hover:text-ivory"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return { upload, overlay, error, note, uploading: Boolean(progress) };
}
