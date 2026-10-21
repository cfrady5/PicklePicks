import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, size = 40, withWordmark = true, href = "/" }: { className?: string; size?: number; withWordmark?: boolean; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Mr. Pickle's Picks home">
      <Image src="/mascot-512.png" alt="" width={size} height={size} priority className="rounded-full ring-1 ring-brand/30 transition group-hover:ring-brand/70" />
      {withWordmark && (
        <span className="font-display leading-none">
          <span className="block text-[15px] font-extrabold tracking-tight text-text">Mr. Pickle&rsquo;s</span>
          <span className="block text-[13px] font-bold uppercase tracking-[0.18em] text-brand">Picks</span>
        </span>
      )}
    </Link>
  );
}

export function Mascot({ className, size = 480, priority = false }: { className?: string; size?: number; priority?: boolean }) {
  return (
    <Image
      src="/mascot.png"
      alt="Mr. Pickle — the sunglasses-wearing pickle mascot in front of a rising green chart"
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none drop-shadow-[0_0_60px_rgba(141,255,50,0.35)]", className)}
    />
  );
}
