import { Card } from "@/components/ui/card";

export function StatCard({ label, value, color = "text-grey-900" }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-mono font-medium text-grey-400 uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className={`text-[28px] font-extrabold font-mono tracking-tight ${color}`}>
        {value}
      </div>
    </Card>
  );
}
