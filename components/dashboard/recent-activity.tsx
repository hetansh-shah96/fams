import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";

interface AllocationItem {
  id: string;
  transferDate: Date;
  status: string;
  asset: { assetCode: string; name: string };
  toLocation: { name: string };
  toDepartment: { name: string };
  transferredBy: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
};

export function RecentActivity({ items }: { items: AllocationItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-blue-500" />
          Recent Transfers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No recent transfers</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.asset.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.asset.assetCode} → {item.toLocation.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] ?? ""}`}>
                    {item.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(item.transferDate), "dd MMM")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
