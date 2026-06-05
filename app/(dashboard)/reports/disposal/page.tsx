import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";

export default async function DisposalReportPage() {
  const session = await auth();
  const locationFilter = session!.user.role === "BRANCH_MANAGER" && session!.user.locationId
    ? { currentLocationId: session!.user.locationId } : {};

  const assets = await prisma.asset.findMany({
    where: { ...locationFilter, status: "DISPOSED" },
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
      currentLocation: true,
      depreciation: { orderBy: { financialYear: "desc" }, take: 1 },
      disposal: { include: { approvedBy: { select: { name: true } } } },
    },
  });

  const totalCost = assets.reduce((s, a) => s + Number(a.purchaseCost), 0);
  const totalProceeds = assets.reduce((s, a) => s + Number(a.disposal?.saleValue ?? 0), 0);
  const totalNetBlock = assets.reduce((s, a) => {
    const lastDep = a.depreciation[0];
    return s + (lastDep ? Number(lastDep.companiesActClosingWDV) : Number(a.purchaseCost));
  }, 0);
  const totalGainLoss = totalProceeds - totalNetBlock;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-orange-500" />Disposal / Scrap Report
        </h1>
        <p className="text-sm text-gray-500">
          {assets.length} assets disposed · Gross Block: ₹{totalCost.toLocaleString("en-IN")} · Net Block: ₹{totalNetBlock.toLocaleString("en-IN", { maximumFractionDigits: 0 })} · Proceeds: ₹{totalProceeds.toLocaleString("en-IN")} ·{" "}
          <span className={totalGainLoss >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            {totalGainLoss >= 0 ? "Gain" : "Loss"}: ₹{Math.abs(totalGainLoss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
        </p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              {["Asset Code", "Name", "Category", "Location", "Method", "Disposal Date", "Gross Cost", "Net Block", "Sale Value", "Gain / Loss", "Approved By"].map((h) => (
                <th key={h} className="text-left px-3 py-3 font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">No disposed assets</td></tr>
            ) : (
              assets.map((a, i) => {
                const lastDep = a.depreciation[0];
                const netBlock = lastDep ? Number(lastDep.companiesActClosingWDV) : Number(a.purchaseCost);
                const proceeds = Number(a.disposal?.saleValue ?? 0);
                const gainLoss = proceeds - netBlock;
                return (
                  <tr key={a.id} className={`border-b last:border-0 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                    <td className="px-3 py-2 font-mono text-blue-700">
                      <Link href={`/assets/${a.id}`} className="hover:underline">{a.assetCode}</Link>
                    </td>
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 text-gray-600">{a.category.name}</td>
                    <td className="px-3 py-2">{a.currentLocation.name}</td>
                    <td className="px-3 py-2">
                      {a.disposal ? (
                        <span className="px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                          {a.disposal.method.replace(/_/g, " ")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {a.disposal ? format(new Date(a.disposal.disposalDate), "dd-MMM-yy") : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">₹{Number(a.purchaseCost).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right">₹{netBlock.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right">₹{proceeds.toLocaleString("en-IN")}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {gainLoss >= 0 ? "+" : ""}₹{gainLoss.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{a.disposal?.approvedBy.name ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
