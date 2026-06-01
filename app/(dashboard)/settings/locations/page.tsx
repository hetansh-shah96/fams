"use client";

import { useEffect, useState } from "react";
import { MasterCrud } from "@/components/settings/master-crud";

const FIELDS = [
  { key: "code", label: "Code", required: true },
  { key: "name", label: "Name", required: true },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
];

export default function LocationsPage() {
  const [items, setItems] = useState([]);

  async function load() {
    const res = await fetch("/api/settings/locations");
    setItems(await res.json());
  }

  useEffect(() => { load(); }, []);

  return (
    <MasterCrud
      title="Locations / Branches"
      items={items}
      fields={FIELDS}
      apiPath="/api/settings/locations"
      onRefresh={load}
    />
  );
}
