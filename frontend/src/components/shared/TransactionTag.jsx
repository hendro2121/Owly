import { ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isNonDiscretionary, typeLabel } from "@/lib/format";

export function TransactionTag({ type }) {
  const isBuy = type === "Buy";
  const nd = isNonDiscretionary(type);
  const label = typeLabel(type);

  const variant = nd ? "default" : isBuy ? "buy" : "sell";

  return (
    <Badge variant={variant} className="gap-1">
      {!nd && (
        isBuy
          ? <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />
          : <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />
      )}
      {label}
    </Badge>
  );
}
