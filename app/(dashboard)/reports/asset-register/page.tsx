import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { PrintButton } from "@/components/reports/print-button";

export default async function AssetRegisterPage() {
  const session = await auth();
  const locationFilter = session!.user.role === "BRANCH_MANAGER" && session!.user.locationId
    ? { currentLocationId: session!.user.locationId } : {};

  const assets = await prisma.asset.findMany({
    where: locationFilter,
    orderBy: { assetCode: "asc" },
    include: {
      category: true,
      currentLocation: true,
      currentDepartment: true,
      assignedUser: { select: { name: true } },
    },
  });

  const totalCost = assets.reduce((s, a) => s + Number(a.purchaseCost), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-orange-500" />Asset Register
          </h1>
          <p className="text-sm text-gray-500">{assets.length} assets · Total cost: ₹{totalCost.toLocaleString("en-IN")}</p>
        </div>
        <PrintButton />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden print:shadow-none">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              {["Asset Code","Name","Category","Make/Model","Serial No","Location","Dept","Status","Purchase Date","Cost (₹)","Residual (₹)","Warranty"].map((h) => (
                <th key={h} className="text-left px-3 py-3 font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((a, i) => (
              <tr key={a.id} className={`border-b last:border-0 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                <td className="px-3 py-2 font-mono text-blue-700">
                  <Link href={`/assets/${a.id}`} className="hover:underline">{a.assetCode}</Link>
                </td>
                <td className="px-3 py-2 font-medium">{a.name}</td>
                <td className="px-3 py-2 text-gray-600">{a.category.name}</td>
                <td className="px-3 py-2 text-gray-600">{[a.make, a.model].filter(Boolean).join(" / ") || "—"}</td>
                <td className="px-3 py-2 font-mono text-gray-500">{a.serialNumber ?? "—"}</td>
                <td className="px-3 py-2">{a.currentLocation.name}</td>
                <td className="px-3 py-2">{a.currentDepartment.name}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500">{format(new Date(a.purchaseDate), "dd-MMM-yy")}</td>
                <td className="px-3 py-2 text-right">₹{Number(a.purchaseCost).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-right">₹{Number(a.residualValue).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-gray-500">
                  {a.warrantyExpiry ? format(new Date(a.warrantyExpiry), "dd-MMM-yy") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t font-semibold text-xs">
              <td colSpan={9} className="px-3 py-2">Total ({assets.length} assets)</td>
              <td className="px-3 py-2 text-right">₹{totalCost.toLocaleString("en-IN")}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
