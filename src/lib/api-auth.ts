import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";

export async function requireApiUser() {
  const session = await getCurrentSession();

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return {
    user: session.user
  };
}

/** Simpler helper — returns the user directly or null. */
export async function getApiUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}
