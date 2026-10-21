import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider", {
  variants: {
    variant: {
      default: "border-border-strong bg-card-2 text-muted",
      brand: "border-brand/40 bg-brand/15 text-brand",
      win: "border-win/40 bg-win/15 text-win",
      loss: "border-loss/40 bg-loss/15 text-loss",
      push: "border-push/40 bg-push/15 text-push",
      pending: "border-pending/40 bg-pending/15 text-pending",
      demo: "border-pending/50 bg-pending/10 text-pending",
      outline: "border-border-strong text-text",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
