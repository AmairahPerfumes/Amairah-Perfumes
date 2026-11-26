// Every next/image on the site goes through this loader (see next.config.js):
// ImageKit does the resizing and format conversion, so Vercel's image
// optimisation — and its monthly quota — is never used.
const ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/ysi7qt88g").replace(/\/+$/, "");

// Files in /public that also live on ImageKit under amairah/site/. If one of
// these is replaced, upload the new version there too (or rename the file).
const SITE_IMAGES = new Set([
  "/3bottles_perfumes.png",
  "/FaqPerfume.png",
  "/find_perfect.png",
  "/logo.png",
  "/luxury_ad_banner.png",
  "/navbar-logo.png",
  "/perfume_bottle.png",
  "/stone_pedestal.png",
]);

// c-at_max: never enlarge an image beyond its original size.
const resize = (url, width, quality) =>
  `${url}${url.includes("?") ? "&" : "?"}tr=w-${width},q-${quality || 75},c-at_max`;

export default function imageLoader({ src, width, quality }) {
  if (src.startsWith(`${ENDPOINT}/`)) return resize(src, width, quality);
  if (SITE_IMAGES.has(src)) return resize(`${ENDPOINT}/amairah/site${src}`, width, quality);

  if (src.startsWith("https://res.cloudinary.com/")) {
    return src.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality || 75));
    return url.toString();
  }
  // Any other file in /public is served as it is.
  if (src.startsWith("/")) return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
  return src;
}
