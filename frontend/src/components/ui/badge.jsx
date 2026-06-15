import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold font-mono transition-colors",
  {
    variants: {
      variant: {
        default: "bg-grey-100 text-grey-500",
        buy: "bg-teal-50 text-teal-500",
        sell: "bg-red-50 text-red-600",
        teal: "bg-teal-50 text-teal-500",
        outline: "border border-grey-200 text-grey-500",
        lse: "bg-blue-50 text-blue-600",
        ams: "bg-purple-50 text-purple-600",
        seafoam: "bg-teal-50 text-teal-500",
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
