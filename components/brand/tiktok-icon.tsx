import { cn } from "@/lib/utils";

export function TikTokIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn("h-4 w-4", className)} {...props}>
      <path d="M16.6 3c.3 2.3 1.6 3.7 3.9 3.9v2.8c-1.4.1-2.6-.3-3.9-1.2v6.3c0 8-8.7 10.5-12.2 4.8-2.3-3.7-.9-10.2 6.4-10.5v3c-.6.1-1.2.2-1.7.4-1.6.5-2.5 1.5-2.3 3.3.5 3.4 6.8 4.4 6.3-2.2V3h3.5Z" />
    </svg>
  );
}
