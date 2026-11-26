// Shrinks an image in the browser before it is uploaded, to save storage.
// "Visually lossless": the picture is only scaled down if it is bigger than the
// site ever shows it, then saved as high-quality WebP (transparency is kept).

// Longest side, in pixels, that is worth storing for each upload folder.
const MAX_EDGE = {
  "amairah/notes": 800, // shown as small round icons
  "amairah/testimonials": 800,
  "amairah/categories": 1600,
  "amairah/hero": 2560, // full-width banners
  "amairah/home-sections": 2560,
  "amairah/bundle": 2560,
};
const DEFAULT_MAX_EDGE = 2000; // product photos
const QUALITY = 0.9;
// GIF and AVIF are uploaded untouched (animation / already compact).
const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp"];

// Re-drawing an animated PNG or WebP would keep only its first frame.
async function isAnimated(file) {
  if (file.type === "image/jpeg") return false;
  const head = new TextDecoder("latin1").decode(await file.slice(0, 65536).arrayBuffer());
  return file.type === "image/webp" ? head.includes("ANIM") : head.includes("acTL");
}

function draw(source, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

const toBlob = (canvas, type) => new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));

/**
 * Returns a smaller File, or the original one if it can't (or needn't) be
 * improved. Never throws.
 */
export async function compressImage(file, folder) {
  if (!COMPRESSIBLE.includes(file.type)) return file;
  let bitmap;
  try {
    if (await isAnimated(file)) return file;
    // Applies the camera's rotation, so phone photos don't come out sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const maxEdge = MAX_EDGE[folder] || DEFAULT_MAX_EDGE;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    // Large reductions are done in halving steps, which keeps edges sharp.
    let source = bitmap;
    let w = bitmap.width;
    let h = bitmap.height;
    while (w / 2 >= width && h / 2 >= height) {
      w = Math.round(w / 2);
      h = Math.round(h / 2);
      source = draw(source, w, h);
    }
    const canvas = draw(source, width, height);

    let blob = await toBlob(canvas, "image/webp");
    if (blob?.type !== "image/webp") {
      // This browser can't write WebP. JPEG is only safe for JPEG input (no transparency).
      if (file.type !== "image/jpeg") return file;
      blob = await toBlob(canvas, "image/jpeg");
    }
    // Not worth re-encoding for a saving under 10%.
    if (!blob || blob.size >= file.size * 0.9) return file;

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${file.name.replace(/\.[^.]*$/, "")}.${extension}`, { type: blob.type });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
