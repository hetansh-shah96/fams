"use client";

import { useRouter } from "next/navigation";

export function FYSelect({ fyList, selected, basePath }: { fyList: string[]; selected: string; basePath: string }) {
  const router = useRouter();
  return (
    <select
      className="text-sm border rounded-lg px-3 py-1.5"
      defaultValue={selected}
      onChange={(e) => router.push(`${basePath}?fy=${e.target.value}`)}
    >
      {fyList.map((f) => <option key={f} value={f}>FY {f}</option>)}
    </select>
  );
}
