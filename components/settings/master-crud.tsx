"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "select";
  options?: string[];
  required?: boolean;
}

interface Props<T extends Record<string, unknown>> {
  title: string;
  items: T[];
  fields: FieldDef[];
  apiPath: string;
  onRefresh: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
}

export function MasterCrud<T extends Record<string, unknown>>({
  title, items, fields, apiPath, onRefresh, canCreate = true, canEdit = true,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({});
    setOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    const f: Record<string, string> = {};
    fields.forEach((field) => { f[field.key] = String(item[field.key] ?? ""); });
    setForm(f);
    setOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((field) => {
        payload[field.key] = field.type === "number" ? Number(form[field.key]) : form[field.key];
      });
      if (editing) payload.id = editing.id;

      const res = await fetch(apiPath, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{items.length} records</p>
        </div>
        {canCreate && (
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />New
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {fields.map((f) => (
                <th key={f.key} className="text-left px-4 py-3 font-semibold text-gray-600">{f.label}</th>
              ))}
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={fields.length + 1} className="text-center py-12 text-gray-400">No records</td></tr>
            ) : (
              items.map((item, i) => (
                <tr key={String(item.id ?? i)} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  {fields.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-gray-700">{String(item[f.key] ?? "—")}</td>
                  ))}
                  {canEdit && (
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `New ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}{field.required && " *"}</Label>
                <Input
                  type={field.type ?? "text"}
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
