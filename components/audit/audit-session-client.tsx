"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, QrCode, CheckCircle, Search, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  VERIFIED: "bg-green-100 text-green-700",
  MISSING: "bg-red-100 text-red-700",
  MISPLACED: "bg-yellow-100 text-yellow-700",
  EXCESS: "bg-blue-100 text-blue-700",
};

interface Entry {
  id: string;
  status: string;
  scannedAt: string | null;
  notes: string | null;
  asset: { id: string; assetCode: string; name: string; category: { name: string }; currentLocation: { name: string } };
  expectedLocation: { name: string };
  foundLocation: { name: string } | null;
}

interface AuditSession {
  id: string;
  name: string;
  status: string;
  totalAssets: number;
  verified: number;
  missing: number;
  misplaced: number;
  startDate: string;
  location: { name: string };
  conductedBy: { name: string };
  entries: Entry[];
}

export function AuditSessionClient({ session, userId }: { session: AuditSession; userId: string }) {
  const router = useRouter();
  const [scanCode, setScanCode] = useState("");
  const [entries, setEntries] = useState(session.entries);
  const [completing, setCompleting] = useState(false);

  const verified = entries.filter((e) => e.status === "VERIFIED").length;
  const missing = entries.filter((e) => e.status === "MISSING").length;
  const misplaced = entries.filter((e) => e.status === "MISPLACED").length;

  async function markVerified(assetCode: string) {
    const entry = entries.find((e) => e.asset.assetCode === assetCode);
    if (!entry) { toast.error(`Asset ${assetCode} not found in this audit`); return; }
    if (entry.status === "VERIFIED") { toast.info("Already verified"); return; }

    const res = await fetch(`/api/audit/${session.id}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: entry.id, status: "VERIFIED" }),
    });

    if (!res.ok) { toast.error("Failed to mark verified"); return; }
    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "VERIFIED", scannedAt: new Date().toISOString() } : e));
    toast.success(`✓ ${entry.asset.name} verified`);
    setScanCode("");
  }

  async function completeSession() {
    setCompleting(true);
    const res = await fetch(`/api/audit/${session.id}/complete`, { method: "POST" });
    if (!res.ok) { toast.error("Failed"); setCompleting(false); return; }
    toast.success("Audit session completed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/audit"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
            <p className="text-sm text-gray-500">{session.location.name} · Started {format(new Date(session.startDate), "dd MMM yyyy")}</p>
          </div>
        </div>
        {session.status === "IN_PROGRESS" && (
          <Button onClick={completeSession} disabled={completing} className="bg-orange-500 hover:bg-orange-600">
            <ClipboardCheck className="w-4 h-4 mr-2" />{completing ? "Completing..." : "Complete Audit"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: session.totalAssets, color: "text-gray-900" },
          { label: "Verified", value: verified, color: "text-green-600" },
          { label: "Missing", value: missing, color: "text-red-600" },
          { label: "Misplaced", value: misplaced, color: "text-yellow-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {session.status === "IN_PROGRESS" && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4 text-orange-500" />Scan Asset</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Scan or type asset code (e.g. FAM-IT-2024-0001)"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && markVerified(scanCode)}
                className="max-w-md"
                autoFocus
              />
              <Button onClick={() => markVerified(scanCode)} className="bg-orange-500 hover:bg-orange-600">
                <CheckCircle className="w-4 h-4 mr-2" />Mark Verified
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Press Enter or click to mark as verified. Connect a barcode/QR scanner for faster scanning.</p>
          </CardContent>
        </Card>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Expected Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Scanned At</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.id} className={`border-b last:border-0 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-medium">{entry.asset.name}</p>
                  <Link href={`/assets/${entry.asset.id}`} className="text-xs font-mono text-blue-700 hover:underline">{entry.asset.assetCode}</Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{entry.asset.category.name}</td>
                <td className="px-4 py-3 text-gray-600">{entry.expectedLocation.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[entry.status] ?? ""}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {entry.scannedAt ? format(new Date(entry.scannedAt), "dd MMM HH:mm") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
