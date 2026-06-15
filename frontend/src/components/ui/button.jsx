import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-grey-900 text-white hover:bg-grey-800",
        teal: "bg-teal-500 text-white hover:bg-teal-600",
        outline: "border border-grey-200 bg-white text-grey-700 hover:bg-grey-50 hover:border-grey-300",
        ghost: "text-grey-500 hover:bg-grey-100 hover:text-grey-700",
        link: "text-teal-500 underline-offset-4 hover:underline",
        buy: "border border-teal-200 bg-teal-50 text-teal-500 hover:bg-teal-100",
        sell: "border border-sell/20 bg-sell-bg text-sell hover:bg-red-100",
        neutral: "border border-grey-200 bg-grey-50 text-grey-500 hover:bg-grey-100",
        dark: "bg-grey-900 text-white hover:bg-grey-800",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        xs: "h-7 px-2.5 text-[11px]",
        lg: "h-11 px-7 text-[15px] font-semibold",
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
