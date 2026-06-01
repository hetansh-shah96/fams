"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save } from "lucide-react";

interface Company {
  id?: string;
  code?: string;
  name?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phoneNo?: string;
  panNo?: string;
  gstNo?: string;
}

export function CompanyClient({ company: initial }: { company: Company }) {
  const [form, setForm] = useState<Company>(initial);
  const [loading, setLoading] = useState(false);

  function set(field: keyof Company, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Company details saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: keyof Company; label: string; span?: boolean }[] = [
    { key: "code", label: "Company Code" },
    { key: "name", label: "Company Name", span: true },
    { key: "address1", label: "Address Line 1", span: true },
    { key: "address2", label: "Address Line 2", span: true },
    { key: "address3", label: "Address Line 3", span: true },
    { key: "email", label: "Email" },
    { key: "phoneNo", label: "Phone No" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "country", label: "Country" },
    { key: "pincode", label: "Pincode" },
    { key: "panNo", label: "PAN No" },
    { key: "gstNo", label: "GST No" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-orange-500" />Company Master
        </h1>
        <p className="text-sm text-gray-500">Organisation details used in reports</p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key} className={`space-y-1.5 ${f.span ? "col-span-2" : ""}`}>
              <Label>{f.label}</Label>
              <Input value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
        <Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Company"}
      </Button>
    </div>
  );
}
