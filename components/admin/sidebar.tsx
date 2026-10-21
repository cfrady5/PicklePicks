"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, PlusCircle, Users, CreditCard, PanelsTopLeft, Megaphone, BarChart3, Menu, X, LogOut, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/picks", label: "Picks", icon: ListChecks },
  { href: "/admin/picks/new", label: "Publish a pick", icon: PlusCircle, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/content", label: "Content & pricing", icon: PanelsTopLeft },
  { href: "/admin/notifications", label: "Notifications", icon: Megaphone },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminSidebar({ name, demo }: { name: string; demo: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [seenPath, setSeenPath] = React.useState(pathname);
  if (seenPath !== pathname) { setSeenPath(pathname); setOpen(false); }
  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="Admin">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href) && !(n.href === "/admin/picks" && pathname === "/admin/picks/new");
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", active ? "bg-brand/12 text-brand shadow-[inset_0_0_0_1px_rgba(141,255,50,0.25)]" : "text-muted hover:bg-white/5 hover:text-text")}>
            <n.icon className="h-4 w-4 shrink-0" /> {n.label}
          </Link>
        );
      })}
    </nav>
  );
  const footer = (
    <div className="mt-6 space-y-2 border-t border-border pt-4">
      <div className="px-1"><div className="truncate text-sm font-semibold">{name}</div><div className="mt-1 flex gap-2"><Badge variant="brand">Admin</Badge>{demo && <Badge variant="demo">Demo</Badge>}</div></div>
      <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:text-text"><ArrowLeft className="h-3.5 w-3.5" /> Member dashboard</Link>
      <form action="/auth/signout" method="post"><button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:text-text"><LogOut className="h-3.5 w-3.5" /> Sign out</button></form>
    </div>
  );
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-bg-2/60 p-4 lg:flex">
        <div className="mb-2 px-1"><Logo /></div>
        <div className="mb-5 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-pending">Control center</div>
        {nav}{footer}
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2"><Logo size={32} /><Badge variant="demo">Admin</Badge></div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open} className="rounded-lg p-2 hover:bg-white/5">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (<div className="fixed inset-0 z-30 lg:hidden"><div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto border-r border-border bg-bg-2 p-4 pt-20 shadow-2xl">{nav}{footer}</div></div>)}
    </>
  );
}
