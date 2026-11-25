// SERVER ONLY — signs ImageKit uploads with the private key.
//
// Uses ImageKit's V2 upload API: the token is a short-lived JWT that covers every
// upload parameter, so the browser can't change the folder, drop the size/type
// checks, or reuse it for something else.
import crypto from "node:crypto";

export const ALLOWED_FOLDERS = [
  "amairah",
  "amairah/products",
  "amairah/categories",
  "amairah/notes",
  "amairah/hero",
  "amairah/home-sections",
  "amairah/testimonials",
  "amairah/bundle",
  "amairah/bundle-items",
];

export const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const MAX_BYTES = 10 * 1024 * 1024;
const TOKEN_TTL_SECONDS = 10 * 60;

const b64url = (value) => Buffer.from(value).toString("base64url");

// "My Photo (1).JPG" + image/jpeg -> "my-photo-1.jpg". The extension comes from
// the allowed type, never from the supplied name.
export function safeFileName(name, type) {
  const base = String(name || "")
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "image"}.${ALLOWED_TYPES[type]}`;
}

export function createUploadToken({ fileName, folder, publicKey, privateKey }) {
  // Everything here (except the file and the token itself) must be sent by the
  // browser exactly as signed.
  const fields = {
    fileName,
    folder: `/${folder}`,
    useUniqueFileName: "true",
    checks: `"file.size" <= "${MAX_BYTES}" AND "file.mime" IN [${Object.keys(ALLOWED_TYPES)
      .map((t) => `"${t}"`)
      .join(", ")}]`,
  };
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT", kid: publicKey };
  // `jti` keeps tokens unique: ImageKit accepts each token once, and two files
  // with the same name signed in the same second would otherwise get identical ones.
  const payload = { ...fields, iat: now, exp: now + TOKEN_TTL_SECONDS, jti: crypto.randomUUID() };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac("sha256", privateKey).update(unsigned).digest("base64url");
  return { token: `${unsigned}.${signature}`, fields };
}
