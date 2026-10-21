"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavLink } from "./mobile-nav";

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={cn("relative rounded-lg px-3 py-2 text-sm font-semibold transition", active ? "text-brand" : "text-muted hover:text-text")}>
            {l.label}
            {active && <span className="absolute inset-x-3 -bottom-[14px] h-0.5 rounded-full bg-brand shadow-[0_0_12px_var(--brand)]" />}
          </Link>
        );
      })}
    </>
  );
}
