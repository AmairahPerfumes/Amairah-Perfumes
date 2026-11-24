"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserCog, Check, AlertCircle, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { updateAdminProfile } from "@/actions/admin/profile";

const inputClass =
  "w-full rounded-xl border border-gold-400/10 bg-ink/40 px-4 py-3 text-sm text-ivory placeholder:text-ivory/30 transition-colors duration-300 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/20 hover:border-gold-400/20 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-ivory/60";
const panelClass =
  "rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-6 backdrop-blur-md md:p-8";

function PasswordField({ id, name, label, value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          disabled={disabled}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          disabled={disabled}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ivory/40 transition-colors hover:text-gold-300 disabled:opacity-40"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ProfileForm({ profile, envLogin = false }) {
  const [state, formAction, pending] = useActionState(updateAdminProfile, {});
  const savedName = useRef(profile?.full_name || "");
  const [name, setName] = useState(profile?.full_name || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");

  // After a successful save: remember the new name as "saved" and clear the password boxes.
  useEffect(() => {
    if (state?.success) {
      savedName.current = name;
      setPassword("");
      setConfirm("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const initial = (profile?.full_name || name || "A").trim().charAt(0).toUpperCase() || "A";
  const nameChanged = name.trim() !== savedName.current.trim();
  const wantsPassword = !envLogin && password.length > 0;
  const dirty = nameChanged || wantsPassword;

  const handleSubmit = (e) => {
    setLocalError("");
    if (wantsPassword) {
      if (password.length < 6) {
        e.preventDefault();
        setLocalError("New password must be at least 6 characters.");
        return;
      }
      if (password !== confirm) {
        e.preventDefault();
        setLocalError("The two passwords don't match.");
        return;
      }
    }
  };

  const error = localError || state.error;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* ------------------------------------------------ who you are */}
      <aside className={`${panelClass} h-fit text-center`}>
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gold-gradient font-display text-4xl font-semibold text-ink shadow-gold">
          {initial}
        </div>
        <h2 className="mt-5 break-words font-display text-xl text-ivory">{profile?.full_name || "Admin"}</h2>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold-400/25 bg-gold-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-200">
          <UserCog className="h-3.5 w-3.5" /> Administrator
        </span>
        <div className="mt-6 space-y-3 border-t border-gold-400/10 pt-5 text-left">
          <p className="flex items-start gap-2.5 break-all text-sm font-medium text-ivory/70">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-300/80" /> {profile?.email || "—"}
          </p>
          <p className="flex items-center gap-2.5 text-sm font-medium text-ivory/70">
            <ShieldCheck className="h-4 w-4 shrink-0 text-green-300/80" /> Full access to the admin panel
          </p>
        </div>
      </aside>

      {/* ------------------------------------------------ edit */}
      <form action={formAction} onSubmit={handleSubmit} className={`${panelClass} space-y-8`}>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {state.success && !error && !dirty && (
          <div className="flex items-center gap-2 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm font-medium text-green-300">
            <Check className="h-4 w-4 shrink-0" /> Profile updated.
          </div>
        )}

        {/* account details */}
        <section className="space-y-5">
          <div>
            <h3 className="font-display text-lg text-ivory">Account details</h3>
            <p className="mt-0.5 text-sm font-semibold text-ivory/60">The name shown in the admin panel.</p>
          </div>
          <div>
            <label htmlFor="full_name" className={labelClass}>Full name</label>
            <input
              id="full_name"
              required
              name="full_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>Email</label>
            <div className="relative">
              <input id="email" disabled value={profile?.email || ""} className={`${inputClass} pr-11`} />
              <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory/30" />
            </div>
            <p className="mt-1.5 text-[13px] font-medium text-ivory/50">Your sign-in email can&apos;t be changed here.</p>
          </div>
        </section>

        {/* password — hidden for the main admin login (its password lives in .env and can't be changed here) */}
        {!envLogin && (
        <section className="space-y-5 border-t border-gold-400/10 pt-7">
          <div>
            <h3 className="font-display text-lg text-ivory">Password</h3>
            <p className="mt-0.5 text-sm font-semibold text-ivory/60">Leave both boxes empty to keep your current password.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <PasswordField
              id="new_password"
              name="new_password"
              label="New password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              disabled={envLogin}
            />
            <PasswordField
              id="confirm_password"
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Type it again"
              disabled={envLogin}
            />
          </div>
          {wantsPassword && confirm.length > 0 && (
            <p className={`text-[13px] font-medium ${password === confirm ? "text-green-300" : "text-amber-300"}`}>
              {password === confirm ? "Passwords match." : "Passwords don't match yet."}
            </p>
          )}
        </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-400/10 pt-6">
          <p className="text-sm font-medium text-ivory/45">{dirty ? "You have unsaved changes." : "No changes to save."}</p>
          <button type="submit" disabled={pending || !dirty} className="btn-gold px-8 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
