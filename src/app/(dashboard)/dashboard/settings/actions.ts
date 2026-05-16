"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

function val(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const name = val(formData, "name");
  const email = val(formData, "email").toLowerCase();

  if (name.length < 2) {
    redirect("/dashboard/settings?error=Name+must+be+at+least+2+characters");
  }

  if (!email.includes("@")) {
    redirect("/dashboard/settings?error=Invalid+email+address");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing && existing.id !== user.id) {
    redirect("/dashboard/settings?error=Email+already+in+use");
  }

  await db.user.update({
    where: { id: user.id },
    data: { name, email }
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?success=Profile+updated");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const currentPassword = val(formData, "currentPassword");
  const newPassword = val(formData, "newPassword");
  const confirmPassword = val(formData, "confirmPassword");

  if (newPassword.length < 8) {
    redirect("/dashboard/settings?error=New+password+must+be+at+least+8+characters");
  }

  if (newPassword !== confirmPassword) {
    redirect("/dashboard/settings?error=Passwords+do+not+match");
  }

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    redirect("/dashboard/settings?error=User+not+found");
  }

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) {
    redirect("/dashboard/settings?error=Current+password+is+incorrect");
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) }
  });

  redirect("/dashboard/settings?success=Password+changed+successfully");
}
