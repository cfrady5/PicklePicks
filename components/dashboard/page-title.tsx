export function DashTitle({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</div>}
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card rounded-2xl p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className={`tabular mt-1.5 font-display text-2xl font-extrabold ${tone ?? ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-2">{sub}</div>}
    </div>
  );
}
