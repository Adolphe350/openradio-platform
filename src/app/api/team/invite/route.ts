import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

const VALID_ROLES = ["ADMIN", "MEMBER"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role: Role = VALID_ROLES.includes(body.role) ? body.role : "MEMBER";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Find the invited user
  const invitee = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!invitee) {
    return NextResponse.json({ error: "No user found with that email address" }, { status: 404 });
  }

  if (invitee.id === auth.user.id) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
  }

  // Check if already a member
  const existing = await db.teamMember.findUnique({
    where: { userId_accountId: { userId: invitee.id, accountId: auth.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
  }

  const member = await db.teamMember.create({
    data: {
      userId: invitee.id,
      accountId: auth.user.id,
      role,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ member }, { status: 201 });
}
