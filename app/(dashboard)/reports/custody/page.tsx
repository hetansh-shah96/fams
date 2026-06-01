import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";

export default async function CustodyReportPage() {
  const session = await auth();

  const users = await prisma.user.findMany({
    where: { isActive: true, assignedAssets: { some: {} } },
    orderBy: { name: "asc" },
    include: {
      location: { select: { name: true } },
      department: { select: { name: true } },
      assignedAssets: {
        where: { status: { not: "DISPOSED" } },
        include: { category: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-orange-500" />Custody Report
        </h1>
        <p className="text-sm text-gray-500">Assets assigned per employee</p>
      </div>

      {users.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No assets currently assigned to employees</p>
      ) : (
        users.map((user) => (
          <div key={user.id} className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-orange-50 px-4 py-3 border-b">
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email} · {user.location?.name ?? "—"} · {user.department?.name ?? "—"}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Asset Code</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Category</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Serial No</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-600">Cost</th>
                </tr>
              </thead>
              <tbody>
                {user.assignedAssets.map((a, i) => (
                  <tr key={a.id} className={`border-b last:border-0 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-2 font-mono text-xs text-blue-700">
                      <Link href={`/assets/${a.id}`} className="hover:underline">{a.assetCode}</Link>
                    </td>
                    <td className="px-4 py-2 font-medium">{a.name}</td>
                    <td className="px-4 py-2 text-gray-600">{a.category.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{a.serialNumber ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{a.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right">₹{Number(a.purchaseCost).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t font-semibold text-sm">
                  <td colSpan={5} className="px-4 py-2">{user.assignedAssets.length} assets</td>
                  <td className="px-4 py-2 text-right">
                    ₹{user.assignedAssets.reduce((s, a) => s + Number(a.purchaseCost), 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
