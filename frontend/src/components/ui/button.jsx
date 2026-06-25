import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-grey-900 text-white hover:bg-grey-700",
        lime: "bg-lime-400 text-grey-900 font-semibold shadow-[0_1px_2px_rgba(10,10,10,0.08)] hover:bg-lime-300 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(188,212,0,0.55)] active:translate-y-0 active:scale-95",
        teal: "bg-teal-500 text-white hover:bg-teal-600",
        outline: "border border-grey-300 bg-white text-grey-900 hover:bg-grey-50 hover:border-grey-400",
        ghost: "text-grey-500 hover:bg-grey-100 hover:text-grey-900",
        link: "text-grey-900 underline-offset-4 hover:underline",
        buy: "border border-lime-300 bg-lime-50 text-grey-900 hover:bg-lime-100",
        sell: "border border-sell/20 bg-sell-bg text-sell hover:bg-red-100",
        neutral: "border border-grey-200 bg-grey-50 text-grey-500 hover:bg-grey-100",
        dark: "bg-grey-900 text-white hover:bg-grey-700",
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
