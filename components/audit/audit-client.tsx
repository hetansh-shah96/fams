"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface Session {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  totalAssets: number;
  verified: number;
  missing: number;
  misplaced: number;
  location: { name: string };
  conductedBy: { name: string };
}

interface Props {
  sessions: Session[];
  locations: { id: string; name: string }[];
  userId: string;
  role: string;
}

export function AuditClient({ sessions, locations, userId, role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");

  const canCreate = ["SUPER_ADMIN", "BRANCH_MANAGER"].includes(role);

  async function handleCreate() {
    if (!name || !locationId) { toast.error("Name and location required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, locationId }),
      });
      if (!res.ok) throw new Error("Failed");
      const session = await res.json();
      toast.success("Audit session created");
      setOpen(false);
      router.push(`/audit/${session.id}`);
    } catch {
      toast.error("Failed to create audit session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Physical Audit</h1>
          <p className="text-sm text-gray-500">{sessions.length} audit sessions</p>
        </div>
        {canCreate && (
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />New Audit
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Session Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Conducted By</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Start Date</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Total</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Verified</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Missing</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No audit sessions</td></tr>
            ) : (
              sessions.map((s, i) => (
                <tr key={s.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.location.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.conductedBy.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(s.startDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 text-center">{s.totalAssets}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-semibold">{s.verified}</td>
                  <td className="px-4 py-3 text-center text-red-600 font-semibold">{s.missing}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === "COMPLETED" ? "default" : "secondary"}
                      className={s.status === "COMPLETED" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}>
                      {s.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/audit/${s.id}`} className="text-orange-600 hover:underline text-xs font-medium">
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-orange-500" />
              New Audit Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Session Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q4 2024 Mumbai Audit" />
            </div>
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Select value={locationId} onValueChange={(v: string | null) => { if (v) setLocationId(v); }}>
                <SelectTrigger>
                  <SelectDisplay value={locationId} placeholder="Select location">
                    {locations.find(l => l.id === locationId)?.name}
                  </SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Creating..." : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
