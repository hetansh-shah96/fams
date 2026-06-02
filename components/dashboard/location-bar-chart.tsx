"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#06b6d4"];

interface Props {
  data: { name: string; value: number; id: string }[];
}

export function LocationBarChart({ data }: Props) {
  const router = useRouter();

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-500" />Assets by Location
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 24 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#4b5563" }}
              tickLine={false}
              axisLine={false}
              angle={-20}
              textAnchor="end"
            />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v) => [v, "Assets"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} cursor="pointer"
              onClick={(d) => router.push(`/assets?locationId=${d.id}`)}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {data.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No location data</p>
        )}
      </CardContent>
    </Card>
  );
}
