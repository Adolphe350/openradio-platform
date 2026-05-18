import { isSuperAdminEmail } from "@/lib/admin";
import { requireUser } from "@/lib/auth";

import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: Promise<{ stationId?: string }>;
}) {
  const user = await requireUser();
  const resolvedParams = params ? await params : {};

  return (
    <DashboardShell
      userName={user.name}
      isSuperAdmin={isSuperAdminEmail(user.email)}
      collapseMainMenu={Boolean(resolvedParams?.stationId)}
    >
      {children}
    </DashboardShell>
  );
}
