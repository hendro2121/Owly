import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SensButton({ id }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={(e) => {
        e.stopPropagation();
        window.open(`/api/sens-pdf/${id}`, "_blank");
      }}
      title="View SENS announcement"
      className="gap-1 font-mono text-[10px] text-grey-400 border border-grey-200 hover:border-grey-300 hover:text-grey-600"
    >
      <FileText className="h-3 w-3" />
      SENS
    </Button>
  );
}
