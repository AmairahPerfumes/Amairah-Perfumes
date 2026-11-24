import { cookies } from "next/headers";
import { verifyAdminSessionToken, COOKIE_NAME as ADMIN_COOKIE_NAME } from "@/lib/adminSession";
import { createClient } from "@/lib/supabase/server";

// Throws if the caller isn't a signed-in admin. Put `await requireAdmin()` at
// the top of every admin server action (reads of private data included).
export async function requireAdmin() {
  if (!(await isAdminRequest())) throw new Error("Unauthorized");
}

// Server-side admin check for server actions. Middleware only guards /admin
// page navigations; a server action can be invoked directly, so every admin
// mutation must verify the caller itself.
export async function isAdminRequest() {
  // Read cookies OUTSIDE the try/catch: during build Next signals "this route is
  // dynamic" by throwing from cookies(), and swallowing that would make the
  // page look unauthorized instead of being rendered per-request.
  const cookieStore = await cookies();
  try {
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (token && (await verifyAdminSessionToken(token))) return true;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return profile?.role === "admin";
  } catch {
    return false;
  }
}
