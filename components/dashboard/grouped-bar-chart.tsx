"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { BarChart2 } from "lucide-react";

const COLORS = [
  "#f97316","#3b82f6","#22c55e","#a855f7","#eab308",
  "#06b6d4","#ec4899","#14b8a6","#f43f5e","#8b5cf6","#84cc16","#fb923c",
];

interface Props {
  data: { name: string; value: number }[];
}

function truncate(s: string, n = 22) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function GroupedBarChart({ data }: Props) {
  const router = useRouter();

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-orange-500" />
          Assets by Category Group
          <span className="text-xs font-normal text-gray-400 ml-auto">Click a bar to filter</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={data.length > 6 ? data.length * 32 : 220}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fontSize: 11, fill: "#4b5563" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={truncate}
            />
            <Tooltip
              formatter={(v) => [v, "Assets"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} cursor="pointer"
              onClick={(d) => router.push(`/reports/asset-register`)}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
