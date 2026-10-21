import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/brand/logo";
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Mascot size={160} className="h-40 w-40 opacity-80" />
      <h1 className="mt-6 font-display text-4xl font-extrabold">In a pickle?</h1>
      <p className="mt-2 text-muted">That page doesn&rsquo;t exist. The jar, however, is right here.</p>
      <div className="mt-6 flex gap-2"><Button asChild><Link href="/">Home</Link></Button><Button variant="secondary" asChild><Link href="/results">Results</Link></Button></div>
    </div>
  );
}
