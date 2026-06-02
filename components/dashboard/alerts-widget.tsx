import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";

interface MaintenanceItem {
  id: string;
  serviceType: string;
  nextDueDate: Date | null;
  asset: {
    id: string;
    assetCode: string;
    name: string;
    currentLocation: { name: string } | null;
  };
}

export function AlertsWidget({ items }: { items: MaintenanceItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Upcoming Renewals (30 days)
          <Link href="/maintenance/renewals" className="ml-auto text-xs text-orange-500 hover:underline flex items-center gap-0.5">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No upcoming renewals</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const days = item.nextDueDate ? differenceInDays(new Date(item.nextDueDate), new Date()) : null;
              const urgent = days !== null && days <= 7;
              return (
                <Link key={item.id} href={`/assets/${item.asset.id}`} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-orange-50 -mx-2 px-2 rounded transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.asset.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.asset.assetCode} · {item.serviceType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={urgent ? "destructive" : "secondary"} className="text-xs">
                      {days !== null ? `${days}d left` : "—"}
                    </Badge>
                    {item.nextDueDate && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(item.nextDueDate), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
