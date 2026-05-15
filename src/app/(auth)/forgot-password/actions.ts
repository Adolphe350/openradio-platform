"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mailer";

function sha256(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function forgotPasswordAction(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";

  if (!email || !email.includes("@")) {
    redirect("/forgot-password?error=Please+enter+a+valid+email+address");
  }

  const user = await db.user.findUnique({ where: { email } });

  // Always show success — never reveal whether the email is registered
  if (!user) {
    redirect(
      `/forgot-password?success=${encodeURIComponent(
        "If that email is registered, you will receive a reset link shortly."
      )}`
    );
  }

  // Invalidate any existing unused tokens
  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${env.APP_BASE_URL}/reset-password?token=${rawToken}`;

  await sendMail({
    to: email,
    subject: "Reset your OpenRadio password",
    text: `Hi ${user.name},\n\nClick the link below to reset your password. It expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="margin-bottom:24px">
          <span style="display:inline-flex;align-items:center;gap:8px">
            <span style="width:28px;height:28px;border-radius:7px;background:#00c8a0;display:inline-flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:14px">O</span>
            <strong style="font-size:16px">openradio</strong>
          </span>
        </div>
        <h1 style="font-size:22px;margin:0 0 12px;color:#1a1a2e">Reset your password</h1>
        <p style="color:#6b7280;margin:0 0 24px;line-height:1.6">
          Hi ${user.name}, we received a request to reset your password. Click the button below — the link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#00c8a0;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:15px">
          Reset Password
        </a>
        <p style="color:#9ca3af;margin:24px 0 0;font-size:13px;line-height:1.6">
          If you didn't request this, you can safely ignore this email. Your password won't change.
          <br>This link expires at ${expiresAt.toUTCString()}.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#d1d5db;font-size:12px;margin:0">OpenRadio Cloud · Open-source internet radio platform</p>
      </div>
    `,
  });

  redirect(
    `/forgot-password?success=${encodeURIComponent(
      "Reset link sent! Check your email. The link expires in 1 hour."
    )}`
  );
}
