"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

const UPLOAD_URL = "https://upload.imagekit.io/api/v2/files/upload";
// Mirrors lib/imagekitToken.js — checked here only to fail fast with a clear
// message; the server and ImageKit enforce the real limits.
const MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

async function readJson(res) {
  return res.json().catch(() => ({}));
}

async function uploadOne(file, folder, signal) {
  if (!IMAGE_ACCEPT.split(",").includes(file.type)) throw new Error("only JPG, PNG, WEBP, AVIF or GIF images are allowed");
  if (file.size > MAX_BYTES) throw new Error("image is larger than 10 MB");

  const auth = await fetch("/api/imagekit/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type, folder }),
    signal,
  });
  const signed = await readJson(auth);
  if (!auth.ok) throw new Error(auth.status === 401 ? "please sign in again" : signed.error || "could not start the upload");

  const form = new FormData();
  form.append("file", file, signed.fields.fileName);
  form.append("token", signed.token);
  Object.entries(signed.fields).forEach(([key, value]) => form.append(key, value));

  const res = await fetch(UPLOAD_URL, { method: "POST", body: form, signal });
  const result = await readJson(res);
  if (!res.ok || !result.url) throw new Error(result.message || "upload failed");
  return result.url;
}

/**
 * Uploads images to ImageKit one after another.
 *
 *   const { upload, overlay, error } = useImageUpload();
 *   upload(files, "amairah/products", (url, file) => …);
 *
 * Render `overlay` somewhere: it blocks the page while files are going up, so a
 * form can't be saved (or a tab switched) before the images have arrived.
 */
export function useImageUpload() {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const upload = useCallback(async (fileList, folder, onEach) => {
    const files = Array.from(fileList || []);
    if (!files.length || abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    document.activeElement?.blur?.();
    const failed = [];

    for (let i = 0; i < files.length; i++) {
      if (controller.signal.aborted) break;
      setProgress({ current: i + 1, total: files.length });
      try {
        const url = await uploadOne(files[i], folder, controller.signal);
        if (!controller.signal.aborted) onEach(url, files[i]);
      } catch (e) {
        if (controller.signal.aborted) break;
        const reason = e instanceof TypeError ? "network error" : e.message;
        failed.push(`${files[i].name}: ${reason}`);
      }
    }

    abortRef.current = null;
    setProgress(null);
    if (failed.length) setError(failed.join(" · "));
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

  return { upload, overlay, error, uploading: Boolean(progress) };
}
