import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-semibold font-mono transition-colors",
  {
    variants: {
      variant: {
        default: "bg-grey-100 text-grey-500",
        buy: "bg-buy-bg text-buy",
        sell: "bg-sell-bg text-sell",
        orange: "bg-raven-orange-light text-raven-orange",
        outline: "border border-grey-200 text-grey-500",
        lse: "bg-blue-50 text-blue-500",
        ams: "bg-purple-50 text-purple-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
