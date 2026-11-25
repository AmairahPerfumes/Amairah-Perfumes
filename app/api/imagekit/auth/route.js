import { isAdminRequest } from "@/lib/adminAuth";
import { ALLOWED_FOLDERS, ALLOWED_TYPES, createUploadToken, safeFileName } from "@/lib/imagekitToken";

// Issues a one-time upload token. Only signed-in admins may upload.
export async function POST(request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { fileName, fileType, folder } = body || {};
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return Response.json({ error: "Unknown upload folder." }, { status: 400 });
  }
  if (!Object.hasOwn(ALLOWED_TYPES, String(fileType))) {
    return Response.json({ error: "Only JPG, PNG, WEBP, AVIF or GIF images are allowed." }, { status: 400 });
  }

  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.error("ImageKit keys are not configured.");
    return Response.json({ error: "Image uploads are not configured." }, { status: 500 });
  }

  return Response.json(
    createUploadToken({ fileName: safeFileName(fileName, fileType), folder, publicKey, privateKey }),
    { headers: { "Cache-Control": "no-store" } }
  );
}
