import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Shield } from "lucide-react";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (session!.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const pageSize = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-orange-500" />System Audit Log
        </h1>
        <p className="text-sm text-gray-500">{total} total entries (immutable)</p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Timestamp</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Entity</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Entity ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No audit logs</td></tr>
            ) : (
              logs.map((log, i) => (
                <tr key={log.id} className={`border-b last:border-0 text-xs ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                  <td className="px-4 py-2.5 text-gray-500 font-mono">{format(new Date(log.timestamp), "dd MMM yyyy HH:mm:ss")}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800">{log.user.name}</p>
                    <p className="text-gray-400">{log.user.email}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      log.action === "CREATE" ? "bg-green-100 text-green-700" :
                      log.action === "UPDATE" ? "bg-blue-100 text-blue-700" :
                      log.action === "DELETE" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{log.entityType}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-400 truncate max-w-32">{log.entityId}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
