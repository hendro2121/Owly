import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-raven-orange/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-raven-orange text-white hover:bg-raven-orange-dark",
        outline: "border border-grey-200 bg-white text-grey-900 hover:bg-grey-50",
        ghost: "hover:bg-grey-100 text-grey-500",
        link: "text-raven-orange underline-offset-4 hover:underline",
        dark: "bg-grey-900 text-white hover:bg-grey-800",
        buy: "border border-buy bg-buy-bg text-buy hover:bg-buy/10",
        sell: "border border-sell bg-sell-bg text-sell hover:bg-sell/10",
        neutral: "border border-grey-200 bg-grey-100 text-grey-500",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        xs: "h-7 px-2.5 text-[11px]",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
