"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export interface NavLink { href: string; label: string }

export function MobileNav({ links, authed, isAdmin }: { links: NavLink[]; authed: boolean; isAdmin: boolean }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [seenPath, setSeenPath] = React.useState(pathname);
  if (seenPath !== pathname) { setSeenPath(pathname); setOpen(false); }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col border-l border-border bg-bg-2 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-300">
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <div className="flex items-center justify-between">
            <Logo />
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu"><X className="h-5 w-5" /></Button>
            </DialogPrimitive.Close>
          </div>
          <nav className="mt-8 flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={cn("rounded-xl px-4 py-3 text-lg font-semibold transition", pathname === l.href ? "bg-brand/10 text-brand" : "text-text hover:bg-white/5")}>
                {l.label}
              </Link>
            ))}
            {authed && <Link href="/dashboard" className="rounded-xl px-4 py-3 text-lg font-semibold text-text hover:bg-white/5">Dashboard</Link>}
            {isAdmin && <Link href="/admin" className="rounded-xl px-4 py-3 text-lg font-semibold text-text hover:bg-white/5">Admin</Link>}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            {authed ? (
              <form action="/auth/signout" method="post"><Button variant="secondary" className="w-full" type="submit">Sign out</Button></form>
            ) : (
              <Button variant="secondary" asChild><Link href="/login">Login</Link></Button>
            )}
            <Button asChild><Link href="/pricing">Get Picks</Link></Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
