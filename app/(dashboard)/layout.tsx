import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <DashboardShell
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
      >
        {children}
      </DashboardShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
