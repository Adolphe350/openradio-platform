"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createUserSession } from "@/lib/auth";

function sha256(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function resetPasswordAction(formData: FormData) {
  const token = (formData.get("token") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const confirm = (formData.get("confirm") as string | null) ?? "";

  if (!token) {
    redirect("/forgot-password?error=Invalid+token");
  }

  if (password.length < 8) {
    redirect(`/reset-password?token=${token}&error=Password+must+be+at+least+8+characters`);
  }

  if (password !== confirm) {
    redirect(`/reset-password?token=${token}&error=Passwords+do+not+match`);
  }

  const tokenHash = sha256(token);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    redirect("/forgot-password?error=Reset+link+has+expired.+Please+request+a+new+one.");
  }

  // Mark token as used and update password atomically
  await db.$transaction([
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    // Invalidate all existing sessions for security
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  // Create a fresh session and send to dashboard
  await createUserSession(record.userId);
  redirect("/dashboard?success=Password+reset+successfully");
}
