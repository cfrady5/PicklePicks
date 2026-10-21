"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, History, LineChart, ClipboardList, Bell, CreditCard, Settings, Users, ShieldCheck, Menu, X, LogOut, Home } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/picks", label: "Today's Picks", icon: Sparkles },
  { href: "/dashboard/history", label: "Pick History", icon: History },
  { href: "/dashboard/analytics", label: "Performance Analytics", icon: LineChart },
  { href: "/dashboard/tracker", label: "My Pick Tracker", icon: ClipboardList },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/community", label: "Pickle Jar Community", icon: Users },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
];

export function DashboardSidebar({ name, planLabel, isAdmin, unread, demo }: { name: string; planLabel: string; isAdmin: boolean; unread: number; demo: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [seenPath, setSeenPath] = React.useState(pathname);
  if (seenPath !== pathname) { setSeenPath(pathname); setOpen(false); }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="Dashboard">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", active ? "bg-brand/12 text-brand shadow-[inset_0_0_0_1px_rgba(141,255,50,0.25)]" : "text-muted hover:bg-white/5 hover:text-text")}>
            <n.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{n.label}</span>
            {n.href === "/dashboard/notifications" && unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold text-bg">{unread}</span>}
          </Link>
        );
      })}
      {isAdmin && (
        <Link href="/admin" className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-border-strong px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-brand/50 hover:text-text">
          <ShieldCheck className="h-4 w-4" /> Admin control center
        </Link>
      )}
    </nav>
  );

  const footer = (
    <div className="mt-6 space-y-2 border-t border-border pt-4">
      <div className="px-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div className="mt-1 flex items-center gap-2"><Badge variant="brand">{planLabel}</Badge>{demo && <Badge variant="demo">Demo</Badge>}</div>
      </div>
      <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:text-text"><Home className="h-3.5 w-3.5" /> Back to site</Link>
      <form action="/auth/signout" method="post"><button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:text-text"><LogOut className="h-3.5 w-3.5" /> Sign out</button></form>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-bg-2/60 p-4 lg:flex">
        <div className="mb-6 px-1"><Logo /></div>
        {nav}
        {footer}
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size={32} />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="rounded-lg p-2 text-text hover:bg-white/5">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto border-r border-border bg-bg-2 p-4 pt-20 shadow-2xl animate-in slide-in-from-left duration-300">{nav}{footer}</div>
        </div>
      )}
    </>
  );
}
