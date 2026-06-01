"use client";

import { useRouter } from "next/navigation";

export function DaysSelect({ days, basePath }: { days: number; basePath: string }) {
  const router = useRouter();
  return (
    <select
      className="text-sm border rounded-lg px-3 py-1.5"
      defaultValue={days}
      onChange={(e) => router.push(`${basePath}?days=${e.target.value}`)}
    >
      {[7, 15, 30, 60, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}
    </select>
  );
}
