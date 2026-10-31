import { isSuperAdminEmail } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell
      userName={user.name}
      userEmail={user.email}
      isSuperAdmin={isSuperAdminEmail(user.email)}
      stations={stations.map((s) => ({ ...s, status: String(s.status) }))}
    >
      {children}
    </DashboardShell>
  );
}
