import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-bg shadow-[0_0_0_1px_rgba(141,255,50,0.4),0_8px_30px_-10px_rgba(141,255,50,0.6)] hover:bg-[#9dff52] hover:shadow-[0_0_0_1px_rgba(141,255,50,0.6),0_12px_40px_-10px_rgba(141,255,50,0.8)]",
        secondary: "bg-card-2 text-text border border-border-strong hover:border-brand/60 hover:bg-[#213829]",
        ghost: "text-muted hover:text-text hover:bg-white/5",
        outline: "border border-brand/50 text-brand hover:bg-brand/10",
        danger: "bg-loss/15 text-loss border border-loss/30 hover:bg-loss/25",
        link: "text-brand underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
export { buttonVariants };
