import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface AllocationItem {
  id: string;
  transferDate: Date;
  status: string;
  asset: { id: string; assetCode: string; name: string };
  toLocation: { name: string };
  toDepartment: { name: string };
  transferredBy: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PENDING:   "bg-yellow-100 text-yellow-700",
  REJECTED:  "bg-red-100 text-red-700",
};

export function RecentActivity({ items }: { items: AllocationItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-blue-500" />
          Recent Transfers
          <Link href="/transfers" className="ml-auto text-xs text-orange-500 hover:underline flex items-center gap-0.5">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No recent transfers</p>
        ) : (
          <div className="space-y-1">
            {items.map(item => (
              <Link key={item.id} href={`/assets/${item.asset.id}`}
                className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-blue-50 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.asset.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.asset.assetCode} → {item.toLocation.name} · {item.toDepartment.name}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] ?? ""}`}>
                    {item.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(item.transferDate), "dd MMM")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
