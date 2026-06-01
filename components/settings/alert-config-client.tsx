"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Save, Plus, X } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  AMC_EXPIRY: "AMC Expiry",
  INSURANCE_EXPIRY: "Insurance Expiry",
  PUC_EXPIRY: "PUC Expiry",
  WARRANTY_EXPIRY: "Warranty Expiry",
  SCHEDULED_SERVICE: "Scheduled Service",
};

interface Config {
  id: string | null;
  type: string;
  daysBeforeAlert: number;
  isActive: boolean;
  notifyEmails: string[];
}

export function AlertConfigClient({ configs: initial }: { configs: Config[] }) {
  const [configs, setConfigs] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [newEmails, setNewEmails] = useState<Record<string, string>>({});

  function updateConfig(type: string, field: keyof Config, value: unknown) {
    setConfigs((prev) => prev.map((c) => c.type === type ? { ...c, [field]: value } : c));
  }

  function addEmail(type: string) {
    const email = (newEmails[type] ?? "").trim();
    if (!email || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    const config = configs.find((c) => c.type === type)!;
    if (config.notifyEmails.includes(email)) { toast.error("Already added"); return; }
    updateConfig(type, "notifyEmails", [...config.notifyEmails, email]);
    setNewEmails((prev) => ({ ...prev, [type]: "" }));
  }

  function removeEmail(type: string, email: string) {
    const config = configs.find((c) => c.type === type)!;
    updateConfig(type, "notifyEmails", config.notifyEmails.filter((e) => e !== email));
  }

  async function saveConfig(config: Config) {
    setSaving(config.type);
    try {
      const res = await fetch("/api/settings/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${TYPE_LABELS[config.type]} config saved`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-orange-500" />Alert Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-1">Set how many days before expiry to send alert emails</p>
      </div>

      {configs.map((config) => (
        <Card key={config.type}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              {TYPE_LABELS[config.type]}
              <label className="flex items-center gap-2 text-sm font-normal">
                <input
                  type="checkbox"
                  checked={config.isActive}
                  onChange={(e) => updateConfig(config.type, "isActive", e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                Active
              </label>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Days Before Alert</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={config.daysBeforeAlert}
                onChange={(e) => updateConfig(config.type, "daysBeforeAlert", Number(e.target.value))}
                className="w-32"
              />
            </div>

            <div className="space-y-2">
              <Label>Notification Emails</Label>
              <div className="flex flex-wrap gap-2">
                {config.notifyEmails.map((email) => (
                  <span key={email} className="flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                    {email}
                    <button onClick={() => removeEmail(config.type, email)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Add email..."
                  value={newEmails[config.type] ?? ""}
                  onChange={(e) => setNewEmails((prev) => ({ ...prev, [config.type]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addEmail(config.type)}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={() => addEmail(config.type)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => saveConfig(config)}
              disabled={saving === config.type}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving === config.type ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
