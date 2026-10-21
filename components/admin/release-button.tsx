"use client";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { releaseScheduled } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function ReleaseButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted">{msg}</span>}
      <Button variant="secondary" disabled={pending || count === 0} onClick={() => start(async () => { const n = await releaseScheduled(); setMsg(`Released ${n}`); router.refresh(); })}>
        <CalendarClock className="h-4 w-4" /> Release due ({count})
      </Button>
    </div>
  );
}
