import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-lg border border-grey-200 bg-white px-4 py-2 text-sm text-grey-900 font-sans placeholder:text-grey-400 focus:outline-none focus:ring-2 focus:ring-raven-orange/30 focus:border-raven-orange disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
