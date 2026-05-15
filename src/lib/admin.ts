import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";

function configuredAdminEmails() {
  return env.SUPER_ADMIN_EMAILS
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string) {
  return configuredAdminEmails().includes(email.toLowerCase());
}

export async function requireSuperAdmin() {
  const user = await requireUser();

  if (!isSuperAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return user;
}
