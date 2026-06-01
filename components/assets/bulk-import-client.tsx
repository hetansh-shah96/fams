"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Download, CheckCircle, XCircle, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

interface ImportRow {
  name: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  categoryCode: string;
  purchaseDate: string;
  purchaseCost: number;
  gstPaid?: number;
  residualValue?: number;
  locationCode: string;
  departmentCode: string;
  condition?: string;
  invoiceNumber?: string;
  status?: string;
}

interface ResultRow {
  row: number;
  name: string;
  status: "success" | "error";
  assetCode?: string;
  error?: string;
}

interface Props {
  categories: { id: string; name: string; code: string }[];
  locations: { id: string; name: string; code: string }[];
  departments: { id: string; name: string; code: string }[];
}

const TEMPLATE_HEADERS = [
  "name", "make", "model", "serialNumber", "categoryCode",
  "purchaseDate (YYYY-MM-DD)", "purchaseCost", "gstPaid", "residualValue",
  "locationCode", "departmentCode", "condition", "invoiceNumber",
];

const SAMPLE_ROWS = [
  ["Dell Laptop", "Dell", "Latitude 5520", "SN001", "IT", "2024-01-15", "75000", "13500", "3750", "MUM-HO", "IT", "NEW", "INV-001"],
  ["Office Chair", "Godrej", "Interio", "", "FURN", "2024-03-01", "15000", "2700", "750", "PUNE-BR", "PUNE-OPS", "GOOD", ""],
];

export function BulkImportClient({ categories, locations, departments }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(false);

  function downloadTemplate() {
    const csv = [TEMPLATE_HEADERS.join(","), ...SAMPLE_ROWS.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fams_asset_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text: string): ImportRow[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const parsed: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (!cols[0]) continue;
      parsed.push({
        name: cols[0],
        make: cols[1] || undefined,
        model: cols[2] || undefined,
        serialNumber: cols[3] || undefined,
        categoryCode: cols[4],
        purchaseDate: cols[5],
        purchaseCost: Number(cols[6]) || 0,
        gstPaid: Number(cols[7]) || 0,
        residualValue: Number(cols[8]) || Math.round(Number(cols[6]) * 0.05),
        locationCode: cols[9],
        departmentCode: cols[10],
        condition: cols[11] || "NEW",
        invoiceNumber: cols[12] || undefined,
      });
    }
    return parsed;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const data = parseCSV(text);
      setRows(data);
      setResults([]);
      setParsed(true);
      toast.success(`Parsed ${data.length} rows`);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    const res: ResultRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const category = categories.find((c) => c.code === row.categoryCode);
        const location = locations.find((l) => l.code === row.locationCode);
        const department = departments.find((d) => d.code === row.departmentCode);

        if (!category) throw new Error(`Unknown categoryCode: ${row.categoryCode}`);
        if (!location) throw new Error(`Unknown locationCode: ${row.locationCode}`);
        if (!department) throw new Error(`Unknown departmentCode: ${row.departmentCode}`);

        const resp = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            make: row.make,
            model: row.model,
            serialNumber: row.serialNumber,
            categoryId: category.id,
            purchaseDate: row.purchaseDate,
            purchaseCost: row.purchaseCost,
            gstPaid: row.gstPaid ?? 0,
            residualValue: row.residualValue ?? Math.round(row.purchaseCost * 0.05),
            status: row.status ?? "ACTIVE",
            currentLocationId: location.id,
            currentDepartmentId: department.id,
            invoiceNumber: row.invoiceNumber,
            condition: row.condition ?? "NEW",
          }),
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error ?? "API error");
        }
        const saved = await resp.json();
        res.push({ row: i + 2, name: row.name, status: "success", assetCode: saved.assetCode });
      } catch (err: unknown) {
        res.push({ row: i + 2, name: row.name, status: "error", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    setResults(res);
    setLoading(false);
    const successCount = res.filter((r) => r.status === "success").length;
    toast.success(`Imported ${successCount}/${rows.length} assets`);
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/assets"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import Assets</h1>
          <p className="text-sm text-gray-500">Import multiple assets from a CSV file</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-orange-500" />Step 1: Download Template</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Download the CSV template, fill in your asset data, then upload below.</p>
          <div className="overflow-x-auto">
            <table className="text-xs border rounded">
              <thead><tr className="bg-gray-50">{TEMPLATE_HEADERS.map((h) => <th key={h} className="px-3 py-2 text-left border-r font-mono text-gray-600">{h}</th>)}</tr></thead>
              <tbody>
                {SAMPLE_ROWS.map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((cell, j) => <td key={j} className="px-3 py-1.5 border-r text-gray-700">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Available codes — Categories: {categories.map((c) => c.code).join(", ")} | Locations: {locations.map((l) => l.code).join(", ")} | Departments: {departments.map((d) => d.code).join(", ")}
          </p>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />Download Template CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4 text-orange-500" />Step 2: Upload CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Click to select CSV file</p>
            <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />

          {parsed && rows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">{rows.length} rows ready to import:</p>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 border-b sticky top-0">
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-left px-3 py-2">Location</th>
                    <th className="text-right px-3 py-2">Cost</th>
                  </tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.categoryCode}</td>
                        <td className="px-3 py-1.5">{r.locationCode}</td>
                        <td className="px-3 py-1.5 text-right">₹{r.purchaseCost.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={handleImport} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                <Upload className="w-4 h-4 mr-2" />{loading ? `Importing... (${results.length}/${rows.length})` : `Import ${rows.length} Assets`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Import Results — <span className="text-green-600">{successCount} success</span>
              {errorCount > 0 && <span className="text-red-600 ml-2">{errorCount} failed</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {results.map((r) => (
                <div key={r.row} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${r.status === "success" ? "bg-green-50" : "bg-red-50"}`}>
                  {r.status === "success" ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  <span className="font-medium">Row {r.row}: {r.name}</span>
                  {r.assetCode && <span className="text-xs font-mono text-green-700 ml-auto">{r.assetCode}</span>}
                  {r.error && <span className="text-xs text-red-600 ml-auto">{r.error}</span>}
                </div>
              ))}
            </div>
            {successCount > 0 && (
              <Link href="/assets" className="mt-3 inline-block">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">View All Assets</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
