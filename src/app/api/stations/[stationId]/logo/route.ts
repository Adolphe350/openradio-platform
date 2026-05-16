import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 1 * 1024 * 1024; // 1MB
const LOGOS_DIR = path.join(env.UPLOAD_DIR, "_logos");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { stationId } = await params;

  const station = await db.station.findFirst({ where: { id: stationId, ownerId: auth.user.id } });
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No logo file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, or WebP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Max 1MB." }, { status: 400 });
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const filename = `${stationId}.${ext}`;
  const logosDir = LOGOS_DIR;

  await mkdir(logosDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(logosDir, filename);
  await writeFile(filePath, buffer);

  const logoUrl = `/api/stations/${stationId}/logo`;

  await db.station.update({
    where: { id: stationId },
    data: { logoUrl },
  });

  return NextResponse.json({ logoUrl });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const { stationId } = await params;

  const station = await db.station.findUnique({ where: { id: stationId }, select: { id: true } });
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const logosDir = LOGOS_DIR;
  for (const ext of ["jpg", "png", "webp"]) {
    const filePath = path.join(logosDir, `${stationId}.${ext}`);
    try {
      const buf = await readFile(filePath);
      const mime = ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";
      const body = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as BodyInit;
      return new NextResponse(body, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      // try next extension
    }
  }

  return NextResponse.json({ error: "Logo not found" }, { status: 404 });
}
