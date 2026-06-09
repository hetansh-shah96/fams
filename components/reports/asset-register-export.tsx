"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, ChevronDown } from "lucide-react";

interface ExportRow {
  no: number;
  assetCode: string;
  name: string;
  makeModel: string;
  itActBlock: string;
  category: string;
  location: string;
  department: string;
  assignedTo: string;
  status: string;
  purchaseDate: string;
  purchaseCost: number;
  residualValue: number;
}

interface Props {
  rows: ExportRow[];
}

function fmtInr(n: number) {
  if (n >= 10_000_000) return `Rs ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `Rs ${(n / 100_000).toFixed(2)} L`;
  return `Rs ${n.toLocaleString("en-IN")}`;
}

export function AssetRegisterExport({ rows }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"xlsx" | "pdf" | null>(null);

  async function exportXlsx() {
    setLoading("xlsx");
    setOpen(false);
    try {
      const XLSX = await import("xlsx");
      const data = [
        ["#", "Asset Code", "Asset Name", "Make / Model", "IT Act Block", "CA Category", "Location", "Department", "Assigned To", "Status", "Purchase Date", "Purchase Cost (₹)", "Residual Value (₹)"],
        ...rows.map(r => [r.no, r.assetCode, r.name, r.makeModel, r.itActBlock, r.category, r.location, r.department, r.assignedTo, r.status, r.purchaseDate, r.purchaseCost, r.residualValue]),
        [],
        ["", "", "", "", "", "", "", "", "", "", "Grand Total", rows.reduce((s, r) => s + r.purchaseCost, 0), ""],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);

      ws["!cols"] = [
        { wch: 4 }, { wch: 14 }, { wch: 30 }, { wch: 22 }, { wch: 30 }, { wch: 26 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
      ];

      const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
      for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "F97316" } } };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asset Register");
      XLSX.writeFile(wb, `asset-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setLoading(null);
    }
  }

  async function exportPdf() {
    setLoading("pdf");
    setOpen(false);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("Asset Register", 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}   Total Assets: ${rows.length}`, 14, 25);

      autoTable(doc, {
        startY: 30,
        head: [["#", "Asset Code", "Name", "IT Act Block", "Location", "Department", "Assigned To", "Status", "Purchase Date", "Cost (₹)", "Residual (₹)"]],
        body: rows.map(r => [
          r.no,
          r.assetCode,
          r.name + (r.makeModel !== "—" ? `\n${r.makeModel}` : ""),
          r.itActBlock,
          r.location,
          r.department,
          r.assignedTo,
          r.status,
          r.purchaseDate,
          fmtInr(r.purchaseCost),
          fmtInr(r.residualValue),
        ]),
        foot: [["", "", "", "", "", "", "", "", "Grand Total", fmtInr(rows.reduce((s, r) => s + r.purchaseCost, 0)), ""]],
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontSize: 7, fontStyle: "bold" },
        footStyles: { fillColor: [254, 243, 232], textColor: [15, 23, 42], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 7, textColor: [55, 65, 81] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          1: { cellWidth: 20, fontStyle: "bold" },
          2: { cellWidth: 38 },
          3: { cellWidth: 38 },
          9: { halign: "right" },
          10: { halign: "right" },
        },
        margin: { left: 14, right: 14 },
        showFoot: "lastPage",
      });

      doc.save(`asset-register-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        disabled={!!loading}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
        ) : (
          <FileText className="w-4 h-4 text-gray-500" />
        )}
        Export
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-white border rounded-xl shadow-lg z-20 overflow-hidden">
            <button
              onClick={exportXlsx}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Excel (.xlsx)
            </button>
            <button
              onClick={exportPdf}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors border-t"
            >
              <FileText className="w-4 h-4 text-red-500" />
              PDF (.pdf)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
