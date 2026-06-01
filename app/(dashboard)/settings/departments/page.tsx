"use client";

import { useEffect, useState } from "react";
import { MasterCrud } from "@/components/settings/master-crud";

const FIELDS = [
  { key: "code", label: "Code", required: true },
  { key: "name", label: "Name", required: true },
  { key: "locationId", label: "Location ID", required: true },
  { key: "remark", label: "Remark" },
];

export default function DepartmentsPage() {
  const [items, setItems] = useState([]);

  async function load() {
    const res = await fetch("/api/settings/departments");
    const data = await res.json();
    setItems(data.map((d: Record<string, unknown>) => ({ ...d, locationName: (d.location as Record<string, unknown>)?.name })));
  }

  useEffect(() => { load(); }, []);

  const displayFields = [
    { key: "code", label: "Code" },
    { key: "name", label: "Department Name" },
    { key: "locationName", label: "Location" },
    { key: "remark", label: "Remark" },
  ];

  return (
    <MasterCrud
      title="Departments"
      items={items}
      fields={displayFields}
      apiPath="/api/settings/departments"
      onRefresh={load}
    />
  );
}
