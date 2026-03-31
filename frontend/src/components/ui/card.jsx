import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border border-grey-200 bg-white", className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-[10px] font-mono font-medium text-grey-400 uppercase tracking-widest", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-5 pb-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
