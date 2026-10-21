import { Section } from "@/components/layout/section";

export function LegalDoc({ title, updated, intro, sections }: { title: string; updated: string; intro?: string; sections: [string, string][] }) {
  return (
    <Section className="max-w-3xl py-12 lg:py-16">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      {intro && <p className="mt-6 rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm leading-relaxed text-text">{intro}</p>}
      <div className="mt-8 space-y-8">
        {sections.map(([h, body]) => (
          <section key={h}><h2 className="font-display text-xl font-bold">{h}</h2><p className="mt-2 leading-relaxed text-muted">{body}</p></section>
        ))}
      </div>
    </Section>
  );
}
