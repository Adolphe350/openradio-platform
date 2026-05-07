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
