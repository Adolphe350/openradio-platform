"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_ROLES = ["ADMIN", "MEMBER"] as const;

export async function inviteTeamMemberAction(formData: FormData) {
  const user = await requireUser();
  const email = (formData.get("email") as string)?.trim().toLowerCase() ?? "";
  const role = (formData.get("role") as string)?.toUpperCase();
  const validRole = VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])
    ? (role as (typeof VALID_ROLES)[number])
    : "MEMBER";

  if (!email) {
    redirect("/dashboard/settings/team?error=Email+is+required");
  }

  const invitee = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!invitee) {
    redirect("/dashboard/settings/team?error=No+user+found+with+that+email");
  }

  if (invitee.id === user.id) {
    redirect("/dashboard/settings/team?error=You+cannot+invite+yourself");
  }

  const existing = await db.teamMember.findUnique({
    where: { userId_accountId: { userId: invitee.id, accountId: user.id } },
  });
  if (existing) {
    redirect("/dashboard/settings/team?error=User+is+already+a+team+member");
  }

  await db.teamMember.create({
    data: { userId: invitee.id, accountId: user.id, role: validRole },
  });

  revalidatePath("/dashboard/settings/team");
}

export async function removeTeamMemberAction(formData: FormData) {
  const user = await requireUser();
  const memberId = (formData.get("memberId") as string) ?? "";

  await db.teamMember.deleteMany({
    where: { id: memberId, accountId: user.id },
  });

  revalidatePath("/dashboard/settings/team");
}
