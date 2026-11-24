"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Search, MessageSquare, Clock, CheckCircle2, Star } from "lucide-react";
import StarRating from "@/components/StarRating";
import StatStrip from "@/components/admin/StatStrip";
import FilterSelect from "@/components/admin/FilterSelect";
import { approveReview, deleteReview } from "@/actions/admin/reviews";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
];

export default function ReviewList({ reviews }) {
  const router = useRouter();
  // Local copy: a row changes the moment its action succeeds, and the counters follow.
  const [items, setItems] = useState(reviews);
  useEffect(() => setItems(reviews), [reviews]);

  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("all");

  const pendingCount = items.filter((r) => !r.is_approved).length;
  const approvedCount = items.length - pendingCount;
  const avg = items.length ? items.reduce((s, r) => s + Number(r.rating), 0) / items.length : 0;

  // Start on "Pending" when something is waiting, otherwise show everything.
  useEffect(() => {
    if (pendingCount === 0) setTab((t) => (t === "pending" ? "all" : t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (r) => {
    setBusyId(r.id);
    setError("");
    try {
      const result = await approveReview(r.id);
      if (result?.success === false) setError(result.error || "Could not approve the review.");
      else {
        setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_approved: true } : x)));
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    setBusyId(r.id);
    setError("");
    try {
      const result = await deleteReview(r.id);
      if (result?.success === false) setError(result.error || "Could not delete the review.");
      else {
        setItems((prev) => prev.filter((x) => x.id !== r.id));
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((r) => {
      if (tab === "pending" && r.is_approved) return false;
      if (tab === "approved" && !r.is_approved) return false;
      if (rating !== "all" && Number(r.rating) !== Number(rating)) return false;
      if (term) {
        const haystack = [r.profiles?.full_name, r.profiles?.email, r.products?.name, r.review_text].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [items, tab, rating, search]);

  const tabCount = { all: items.length, pending: pendingCount, approved: approvedCount };

  const stats = [
    { label: "Total Reviews", value: items.length, icon: MessageSquare },
    { label: "Waiting for approval", value: pendingCount, icon: Clock, tone: pendingCount ? "text-amber-300" : "" },
    { label: "Approved", value: approvedCount, icon: CheckCircle2, tone: "text-green-300" },
    { label: "Average rating", value: avg ? avg.toFixed(1) : "—", icon: Star, tone: "text-gold-200" },
  ];

  return (
    <div>
      <StatStrip stats={stats} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                tab === t.key ? "border-gold-400/30 bg-gold-400/10 text-gold-200" : "border-gold-400/10 text-ivory/50 hover:text-ivory"
              }`}
            >
              {t.label}
              <span className={`ml-2 rounded-full px-1.5 text-xs ${t.key === "pending" && pendingCount ? "bg-amber-400/20 text-amber-200" : "bg-ivory/10 text-ivory/50"}`}>{tabCount[t.key]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviews…"
              className="w-full rounded-xl border border-gold-400/10 bg-ink-soft/40 py-2.5 pl-9 pr-3 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold-400/30 focus:outline-none sm:w-64"
            />
          </div>
          <FilterSelect
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="sm:w-36"
            options={[
              { value: "all", label: "All Ratings" },
              { value: "5", label: "5 Stars" },
              { value: "4", label: "4 Stars" },
              { value: "3", label: "3 Stars" },
              { value: "2", label: "2 Stars" },
              { value: "1", label: "1 Star" },
            ]}
          />
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300">{error}</p>}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-[2rem] border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 px-6 py-14 text-center backdrop-blur-md">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
            <MessageSquare className="h-5 w-5" />
          </div>
          <p className="text-base text-ivory/70">{tab === "pending" && !search && rating === "all" ? "Nothing waiting for approval" : "No reviews here"}</p>
          <p className="mt-1 text-sm font-medium text-ivory/45">
            {tab === "pending" && !search && rating === "all" ? "You are all caught up." : "Try a different filter or search."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const who = r.profiles?.full_name || r.profiles?.email || "Customer";
            return (
              <li
                key={r.id}
                className={`rounded-2xl border bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 p-5 backdrop-blur-md ${
                  r.is_approved ? "border-gold-400/10" : "border-amber-400/25"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold-400/20 bg-gold-400/10 font-display text-base text-gold-200">
                      {who.trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <p className="text-base font-semibold text-ivory">{who}</p>
                        <StarRating rating={Number(r.rating)} size={14} />
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                            r.is_approved ? "border-green-400/20 bg-green-400/15 text-green-300" : "border-amber-400/25 bg-amber-400/10 text-amber-200"
                          }`}
                        >
                          {r.is_approved ? "Approved" : "Waiting"}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-medium text-ivory/45">
                        on <span className="text-ivory/70">{r.products?.name || "a product"}</span>
                        {r.created_at && <> · {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
                      </p>
                      <p className="mt-3 break-words text-[15px] font-medium leading-relaxed text-ivory/75">
                        {r.review_text ? <>&ldquo;{r.review_text}&rdquo;</> : <em className="font-normal text-ivory/35">No comment — rating only</em>}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 border-t border-gold-400/10 pt-3 sm:border-0 sm:pt-0">
                    {!r.is_approved && (
                      <button
                        onClick={() => handleApprove(r)}
                        disabled={busyId === r.id}
                        className="flex items-center gap-1.5 rounded-xl bg-green-400/15 px-4 py-2 text-sm font-semibold text-green-300 transition-colors hover:bg-green-400/25 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={busyId === r.id}
                      aria-label="Delete review"
                      className="rounded-xl p-2.5 text-ivory/40 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
