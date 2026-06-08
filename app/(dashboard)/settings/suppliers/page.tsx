"use client";

import { useEffect, useState } from "react";
import { MasterCrud } from "@/components/settings/master-crud";

const FIELDS = [
  { key: "code", label: "Code", required: true },
  { key: "name", label: "Name", required: true },
  { key: "contactPerson", label: "Contact Person" },
  { key: "email", label: "Email", type: "email" as const },
  { key: "contactNo", label: "Contact No" },
  { key: "city", label: "City" },
  { key: "gstNo", label: "GST No" },
  { key: "supplierType", label: "Supplier Type" },
];

export default function SuppliersPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  async function load() {
    const res = await fetch("/api/settings/suppliers");
    setItems(await res.json());
  }

  useEffect(() => { load(); }, []);

  return (
    <MasterCrud
      title="Suppliers"
      items={items}
      fields={FIELDS}
      apiPath="/api/settings/suppliers"
      onRefresh={load}
      getViewHref={(item) => `/settings/suppliers/${item.id}`}
    />
  );
}
