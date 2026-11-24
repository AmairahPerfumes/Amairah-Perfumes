import { cookies } from "next/headers";
import { getAdminProfile } from "@/actions/admin/profile";
import { verifyAdminSessionToken, COOKIE_NAME as ADMIN_COOKIE_NAME } from "@/lib/adminSession";
import ProfileForm from "./_components/ProfileForm";

export const metadata = { title: "My Profile" };

export default async function AdminProfilePage() {
  const profile = await getAdminProfile();

  // The main admin signs in with the ADMIN_EMAIL / ADMIN_PASSWORD from the server's
  // .env file, so its password can't be changed from this screen.
  const cookieStore = await cookies();
  const envLogin = Boolean(await verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value));

  return (
    <div>
      <div className="mb-8 border-b border-gold-400/10 pb-6">
        <h1 className="font-display text-3xl font-light text-ivory">
          My <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 via-gold-200 to-gold-400">Profile</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-base font-medium text-ivory/65">Your admin account details.</p>
      </div>
      <ProfileForm profile={profile} envLogin={envLogin} />
    </div>
  );
}
