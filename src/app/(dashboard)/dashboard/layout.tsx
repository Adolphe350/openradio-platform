import { requireUser } from "@/lib/auth";

import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return <DashboardShell userName={user.name}>{children}</DashboardShell>;
}
