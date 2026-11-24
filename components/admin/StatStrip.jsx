// Row of summary tiles at the top of an admin list page.
// stats: [{ label, value, icon?, tone? }]   tone: a text colour class for the number
export default function StatStrip({ stats, cols = 4 }) {
  const colClass = cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <div className={`mb-6 grid grid-cols-2 gap-3 sm:gap-4 ${colClass}`}>
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3.5 rounded-2xl border border-gold-400/10 bg-gradient-to-b from-ink-soft/80 to-ink-soft/30 px-4 py-4"
        >
          {s.icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
              <s.icon className="h-[18px] w-[18px]" />
            </div>
          )}
          <div className="min-w-0">
            <p className={`truncate font-display text-2xl leading-none ${s.tone || "text-ivory"}`}>{s.value}</p>
            <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-wider text-ivory/50">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
