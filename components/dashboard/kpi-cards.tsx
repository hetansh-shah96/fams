import { Package, CheckCircle, Wrench, Clock, Archive, IndianRupee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardsProps {
  total: number;
  active: number;
  inRepair: number;
  idle: number;
  retired: number;
  grossBlock: number;
}

function formatCrore(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const cards = (props: KpiCardsProps) => [
  { label: "Total Assets", value: props.total, icon: Package, color: "bg-blue-50 text-blue-600", border: "border-l-blue-500" },
  { label: "Active", value: props.active, icon: CheckCircle, color: "bg-green-50 text-green-600", border: "border-l-green-500" },
  { label: "In Repair", value: props.inRepair, icon: Wrench, color: "bg-orange-50 text-orange-600", border: "border-l-orange-500" },
  { label: "Idle", value: props.idle, icon: Clock, color: "bg-yellow-50 text-yellow-600", border: "border-l-yellow-500" },
  { label: "Retired", value: props.retired, icon: Archive, color: "bg-gray-50 text-gray-500", border: "border-l-gray-400" },
  { label: "Gross Block", value: formatCrore(props.grossBlock), icon: IndianRupee, color: "bg-purple-50 text-purple-600", border: "border-l-purple-500" },
];

export function KpiCards(props: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards(props).map((card) => (
        <Card key={card.label} className={`border-l-4 ${card.border} shadow-sm`}>
          <CardContent className="p-4">
            <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
