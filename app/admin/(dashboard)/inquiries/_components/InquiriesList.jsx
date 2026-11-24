"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Trash2, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { resolveInquiry, deleteInquiry } from "@/actions/admin/inquiries";

const TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "resolved", label: "Resolved" },
];

export default function InquiriesList({ inquiries }) {
  const router = useRouter();
  // Local copy so the counts and rows update the moment an action succeeds; it
  // re-syncs whenever the server sends fresh data.
  const [items, setItems] = useState(inquiries);
  useEffect(() => setItems(inquiries), [inquiries]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  const toggle = async (inq) => {
    setBusyId(inq.id);
    setError("");
    try {
      const result = await resolveInquiry(inq.id, !inq.is_resolved);
      if (result?.success) {
        setItems((prev) => prev.map((x) => (x.id === inq.id ? { ...x, is_resolved: !inq.is_resolved } : x)));
        router.refresh();
      } else {
        setError(result?.error || "Could not update the inquiry.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (inq) => {
    if (!window.confirm(`Delete the inquiry from ${inq.name}? This cannot be undone.`)) return;
    setBusyId(inq.id);
    setError("");
    try {
      const result = await deleteInquiry(inq.id);
      if (result?.success) {
        setItems((prev) => prev.filter((x) => x.id !== inq.id));
        router.refresh();
      } else {
        setError(result?.error || "Could not delete the inquiry.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const unresolvedCount = items.filter((i) => !i.is_resolved).length;
  const stats = [
    { label: "Total Inquiries", value: items.length, icon: MessageSquare },
    { label: "Unresolved", value: unresolvedCount, icon: Clock },
    { label: "Resolved", value: items.length - unresolvedCount, icon: CheckCircle2 },
  ];

  const filtered = items.filter((inq) => {
    if (tab === "new") return !inq.is_resolved;
    if (tab === "resolved") return inq.is_resolved;
    return true;
  });

  return (
    <div>
      {/* Stat Strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-2xl border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 px-4 py-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
              <s.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl leading-none text-ivory">{s.value}</p>
              <p className="truncate text-xs uppercase tracking-wide text-ivory/40">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors duration-300 ${
              tab === t.key
                ? "border-gold-400/30 bg-gold-400/10 text-gold-200"
                : "border-gold-400/10 text-ivory/40 hover:text-ivory"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

      {filtered.length === 0 ? (
        <p className="rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 py-12 text-center text-sm text-ivory/40 backdrop-blur-md">
          No inquiries here.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((inq) => (
            <li
              key={inq.id}
              className="rounded-2xl border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-5 backdrop-blur-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base text-ivory">{inq.name}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        inq.is_resolved
                          ? "bg-green-400/15 text-green-300 border-green-400/20"
                          : "bg-gold-400/10 text-gold-200 border-gold-400/20"
                      }`}
                    >
                      {inq.is_resolved ? "Resolved" : "New"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-sm text-ivory/40">
                    {inq.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {inq.email}
                      </span>
                    )}
                    {inq.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {inq.phone}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 break-words text-sm text-ivory/70">{inq.message}</p>
                  <p className="mt-2 text-sm text-ivory/30">{new Date(inq.created_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggle(inq)}
                    disabled={busyId === inq.id}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-300 disabled:opacity-50 ${
                      inq.is_resolved
                        ? "border-gold-400/10 text-ivory/50 hover:text-gold-300"
                        : "border-green-400/20 bg-green-400/10 text-green-300 hover:bg-green-400/20"
                    }`}
                  >
                    Mark {inq.is_resolved ? "Unresolved" : "Resolved"}
                  </button>
                  <button
                    onClick={() => remove(inq)}
                    disabled={busyId === inq.id}
                    aria-label={`Delete inquiry from ${inq.name}`}
                    title="Delete"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-red-400/20 text-red-300/80 transition-colors duration-300 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
