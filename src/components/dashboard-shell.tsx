import { Suspense } from "react";
import { signOutAction } from "@/app/(auth)/auth-actions";
import { StudioSidebar, type SidebarStation } from "@/components/studio-sidebar";

type Props = {
  userName: string;
  userEmail?: string;
  isSuperAdmin?: boolean;
  stations?: SidebarStation[];
  collapseMainMenu?: boolean;
  children: React.ReactNode;
};

/** Station-admin shell: left studio sidebar (expanded on desktop, icon rail
 *  on tablet, drawer on phones) with the ON AIR status pill on top. */
export function DashboardShell({ userName, userEmail = "", isSuperAdmin = false, stations = [], children }: Props) {
  return (
    <div className="studio-shell">
      <Suspense fallback={<aside className="studio-sidebar" aria-label="Studio menu" />}>
        <StudioSidebar
          userName={userName}
          userEmail={userEmail}
          isSuperAdmin={isSuperAdmin}
          stations={stations}
          signOut={signOutAction}
        />
      </Suspense>
      <div className="studio-main">
        <main id="main" className="studio-content">{children}</main>
      </div>
    </div>
  );
}
