import { getRepo } from "@/lib/data";
import { DashTitle } from "@/components/dashboard/page-title";
import { SiteContentForm, PromoUploadForm, PlanForm } from "@/components/admin/content-forms";

export default async function AdminContentPage() {
  const repo = getRepo();
  const [content, plans] = await Promise.all([repo.getSiteContent(), repo.listPlans()]);
  return (
    <>
      <DashTitle eyebrow="Site" title="Content & pricing" subtitle="Homepage copy, promotional graphics and subscription plans. Prices are placeholders until the business decides otherwise." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card rounded-2xl p-6"><h2 className="font-display text-base font-bold">Homepage hero</h2><div className="mt-4"><SiteContentForm content={content} /></div></section>
        <section className="card h-fit rounded-2xl p-6"><h2 className="font-display text-base font-bold">Promotional graphic</h2><div className="mt-4"><PromoUploadForm current={content.promoImageUrl} /></div></section>
      </div>
      <section className="mt-8">
        <h2 className="mb-1 font-display text-lg font-bold">Subscription plans</h2>
        <p className="mb-4 text-xs text-muted-2">Changing a price here updates the site immediately. If a live provider is enabled, also update the provider price and the STRIPE_PRICE_* env var.</p>
        <div className="grid gap-4 lg:grid-cols-3">{plans.map((p) => <PlanForm key={p.key} plan={p} />)}</div>
      </section>
    </>
  );
}
