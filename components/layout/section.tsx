import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

export function Section({ id, eyebrow, title, subtitle, children, className, align = "left" }: { id?: string; eyebrow?: string; title?: string; subtitle?: string; children: React.ReactNode; className?: string; align?: "left" | "center" }) {
  return (
    <section id={id} className={cn("mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24", className)}>
      {(title || eyebrow) && (
        <Reveal className={cn("mb-10", align === "center" && "text-center")}>
          {eyebrow && <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</div>}
          {title && <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>}
          {subtitle && <p className={cn("mt-3 max-w-2xl text-base text-muted sm:text-lg", align === "center" && "mx-auto")}>{subtitle}</p>}
        </Reveal>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="grid-bg absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-16">
        <div>
          {eyebrow && <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</div>}
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-2xl text-muted sm:text-lg">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
