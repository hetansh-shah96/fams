"use client";

import { useEffect, useState } from "react";
import { MasterCrud } from "@/components/settings/master-crud";

const FIELDS = [
  { key: "code", label: "Code", required: true },
  { key: "name", label: "Name", required: true },
  { key: "usefulLifeCompaniesAct", label: "Useful Life (years)", type: "number" as const },
  { key: "itActBlockRate", label: "IT Act Block Rate (e.g. 0.40)", type: "number" as const },
  { key: "depreciationMethod", label: "Method (SLM/WDV)" },
  { key: "assetClassDescription", label: "Class Description" },
];

export default function CategoriesPage() {
  const [items, setItems] = useState([]);

  async function load() {
    const res = await fetch("/api/settings/categories");
    setItems(await res.json());
  }

  useEffect(() => { load(); }, []);

  return (
    <MasterCrud
      title="Asset Categories"
      items={items}
      fields={FIELDS}
      apiPath="/api/settings/categories"
      onRefresh={load}
    />
  );
}
