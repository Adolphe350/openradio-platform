import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { memberId } = await params;

  const member = await db.teamMember.findFirst({
    where: { id: memberId, accountId: auth.user.id },
  });

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  await db.teamMember.delete({ where: { id: memberId } });
  return NextResponse.json({ success: true });
}
