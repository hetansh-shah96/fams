import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col">
        <Topbar
          user={{
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
          }}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
