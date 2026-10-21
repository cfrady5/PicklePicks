"use client";
import * as React from "react";
import type { Pick } from "@/lib/data/types";
import { TicketCard } from "@/components/picks/ticket-card";
import { Segmented } from "@/components/ui/tabs";
import { PickleIcon } from "@/components/brand/pickle-icon";
import { cn } from "@/lib/utils";

type Mode = "wins" | "all";

/**
 * Infinite, draggable horizontal ticket carousel.
 * - CSS marquee for the idle animation (pauses on hover / while dragging)
 * - Pointer drag with momentum (rAF-based inertia)
 * - The track is duplicated so the loop is seamless; offsets wrap modulo half width.
 */
export function PickleJarCarousel({ wins, all, demo }: { wins: Pick[]; all: Pick[]; demo: boolean }) {
  const [mode, setMode] = React.useState<Mode>("wins");
  const list = mode === "wins" ? wins : all;
  const items = list.length ? list : [];
  const trackRef = React.useRef<HTMLDivElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const offset = React.useRef(0);
  const vel = React.useRef(0);
  const last = React.useRef({ x: 0, t: 0 });
  const raf = React.useRef(0);
  const movedRef = React.useRef(false);

  const halfWidth = () => (trackRef.current?.scrollWidth ?? 0) / 2;
  const apply = React.useCallback(() => {
    const hw = halfWidth();
    if (hw > 0) {
      offset.current = ((offset.current % hw) + hw) % hw;
    }
    if (trackRef.current) trackRef.current.style.transform = `translateX(${-offset.current}px)`;
  }, []);

  const stopInertia = () => cancelAnimationFrame(raf.current);
  const inertia = React.useCallback(() => {
    stopInertia();
    const step = () => {
      if (Math.abs(vel.current) < 0.02) { vel.current = 0; return; }
      offset.current += vel.current * 16;
      vel.current *= 0.95;
      apply();
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [apply]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    stopInertia();
    // Freeze the CSS animation at its current translate so drag begins from the visible position.
    const m = new DOMMatrixReadOnly(getComputedStyle(trackRef.current).transform);
    offset.current = -m.m41;
    trackRef.current.style.animation = "none";
    apply();
    setDragging(true);
    movedRef.current = false;
    vel.current = 0;
    last.current = { x: e.clientX, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - last.current.x;
    const dt = Math.max(1, now - last.current.t);
    if (Math.abs(dx) > 2) movedRef.current = true;
    offset.current -= dx;
    vel.current = -dx / dt;
    last.current = { x: e.clientX, t: now };
    apply();
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    inertia();
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (movedRef.current) { e.preventDefault(); e.stopPropagation(); movedRef.current = false; }
  };

  // Reset when the list changes: resume CSS marquee.
  React.useEffect(() => {
    stopInertia();
    offset.current = 0;
    vel.current = 0;
    if (trackRef.current) { trackRef.current.style.animation = ""; trackRef.current.style.transform = ""; }
  }, [mode, items.length]);

  const duration = Math.max(30, items.length * 6);

  if (!items.length) {
    return (
      <div className="card rounded-2xl p-10 text-center text-muted">
        <PickleIcon className="mx-auto h-8 w-8 text-brand/60" />
        <p className="mt-3 font-semibold text-text">The jar is empty for now.</p>
        <p className="mt-1 text-sm">Winning tickets appear here automatically as picks are settled. Nothing is ever back-filled.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={mode} onChange={setMode} size="md" options={[{ value: "wins", label: "Recent Wins" }, { value: "all", label: "All Settled Picks" }]} />
        <p className="text-xs text-muted">
          {mode === "wins" ? `${wins.length} most recent winning tickets` : `Last ${all.length} settled picks — wins, losses and pushes`}
          {demo && <span className="ml-2 rounded border border-pending/40 bg-pending/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pending">Demo data</span>}
        </p>
      </div>
      <div
        ref={wrapRef}
        className={cn("marquee fade-x relative -mx-4 overflow-hidden px-4 py-3 sm:-mx-6 sm:px-6", dragging ? "cursor-grabbing" : "cursor-grab")}
        data-paused={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        role="region"
        aria-roledescription="carousel"
        aria-label={mode === "wins" ? "Recent winning tickets" : "Recent settled picks"}
      >
        <div ref={trackRef} className="marquee-track flex w-max gap-4" style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}>
          {[...items, ...items].map((p, i) => (
            <TicketCard key={`${p.id}-${i}`} pick={p} flash={i < items.length && mode === "wins"} className="select-none" />
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-2">Hover to pause · drag to browse · click a ticket for its verified record</p>
    </div>
  );
}
