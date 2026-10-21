import { DashTitle } from "@/components/dashboard/page-title";
import { PickForm } from "@/components/admin/pick-form";

export default function NewPickPage() {
  return (
    <>
      <DashTitle eyebrow="Fresh Picks" title="Publish a pick" subtitle="Everything you enter here becomes part of the permanent public record once published." />
      <PickForm />
    </>
  );
}
