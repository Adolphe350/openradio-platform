"use server";

import { redirect } from "next/navigation";

import { createUserSession, clearCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signInSchema, signUpSchema } from "@/lib/validation";

function toStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function signUpAction(formData: FormData) {
  const candidate = {
    name: toStringValue(formData.get("name")),
    email: toStringValue(formData.get("email")).toLowerCase(),
    password: toStringValue(formData.get("password"))
  };

  const parsed = signUpSchema.safeParse(candidate);

  if (!parsed.success) {
    redirect(`/sign-up?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid form")}`);
  }

  const existingUser = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    redirect("/sign-up?error=Account%20already%20exists");
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password)
    }
  });

  await createUserSession(user.id);
  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  const candidate = {
    email: toStringValue(formData.get("email")).toLowerCase(),
    password: toStringValue(formData.get("password"))
  };

  const parsed = signInSchema.safeParse(candidate);

  if (!parsed.success) {
    redirect("/sign-in?error=Invalid%20credentials");
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (!user) {
    redirect("/sign-in?error=Invalid%20credentials");
  }

  const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    redirect("/sign-in?error=Invalid%20credentials");
  }

  await createUserSession(user.id);
  redirect("/dashboard");
}

export async function signOutAction() {
  await clearCurrentSession();
  redirect("/");
}
