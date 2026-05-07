import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

const COOKIE_NAME = env.SESSION_COOKIE_NAME;

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getExpiryDate() {
  const expires = new Date();
  expires.setDate(expires.getDate() + env.SESSION_TTL_DAYS);
  return expires;
}

export async function createUserSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const forwardedFor = requestHeaders.get("x-forwarded-for");

  const session = await db.session.create({
    data: {
      userId,
      sessionToken: tokenHash,
      expiresAt: getExpiryDate(),
      userAgent: userAgent?.slice(0, 255),
      ipAddress: forwardedFor?.split(",")[0]?.trim().slice(0, 64)
    }
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt
  });
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    await db.session.deleteMany({ where: { sessionToken: tokenHash } });
  }

  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const session = await db.session.findUnique({
    where: { sessionToken: tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  if (!session) {
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } });
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  await db.session.update({
    where: { id: session.id },
    data: {
      lastActiveAt: new Date()
    }
  });

  return {
    sessionId: session.id,
    user: session.user as SessionUser
  };
}

export async function requireUser() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session.user;
}
