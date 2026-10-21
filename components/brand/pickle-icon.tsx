import { cn } from "@/lib/utils";

/** Small inline pickle glyph for microcopy and bullets. */
export function PickleIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("h-4 w-4", className)} {...props}>
      <path d="M7.2 19.4c-2.4-2.4-2.6-6.6-.3-10.2C9.4 5.3 13.5 3.3 16 4c1 .3 1.5 1 1.8 2 .8 2.6-1.1 7-4.3 10.2-2.6 2.6-5 3.9-6.3 3.2Z" fill="currentColor" opacity=".9" />
      <circle cx="10" cy="12" r=".9" fill="#080d0a" opacity=".5" />
      <circle cx="13" cy="9" r=".9" fill="#080d0a" opacity=".5" />
      <circle cx="9" cy="15.5" r=".9" fill="#080d0a" opacity=".5" />
      <path d="M17 3.5c.9-.9 2.3-.9 2.6-.2.3.6-.4 1.6-1.5 2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
