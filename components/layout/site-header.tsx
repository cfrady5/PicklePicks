import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { MobileNav, type NavLink } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { getCurrentUser } from "@/lib/auth";
import { LayoutDashboard, ShieldCheck } from "lucide-react";

const LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  return (
    <header className="sticky top-0 z-40 glass border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavLinks links={LINKS} />
          {user && (
            <Link href="/dashboard" className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:text-text">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:text-text">
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <form action="/auth/signout" method="post" className="hidden md:block">
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          ) : (
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex"><Link href="/login">Login</Link></Button>
          )}
          <Button size="sm" asChild className="hidden sm:inline-flex"><Link href={user ? "/dashboard/picks" : "/pricing"}>Get Picks</Link></Button>
          <MobileNav links={LINKS} authed={Boolean(user)} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
