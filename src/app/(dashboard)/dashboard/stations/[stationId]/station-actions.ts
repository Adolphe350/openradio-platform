"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ScheduleSourceType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateStationConfig } from "@/lib/generate-station-config";

function val(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

async function owned(stationId: string, userId: string) {
  const s = await db.station.findFirst({ where: { id: stationId, ownerId: userId } });
  if (!s) throw new Error("Not found");
  return s;
}

// ── Geo-blocking ──────────────────────────────────────────────────
export async function addGeoBlockAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const countryCode = val(fd, "countryCode").toUpperCase();
  const countryName = val(fd, "countryName");
  await owned(stationId, user.id);
  if (!countryCode || !countryName) redirect(`/dashboard/stations/${stationId}?tab=geo&error=Country+required`);
  try {
    await db.geoBlock.create({ data: { stationId, countryCode, countryName } });
  } catch {
    redirect(`/dashboard/stations/${stationId}?tab=geo&error=Already+blocked`);
  }
  await generateIcecastAcl(stationId);
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function removeGeoBlockAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const countryCode = val(fd, "countryCode").toUpperCase();
  await owned(stationId, user.id);
  await db.geoBlock.deleteMany({ where: { stationId, countryCode } });
  await generateIcecastAcl(stationId);
  revalidatePath(`/dashboard/stations/${stationId}`);
}

// ── Relay streams ─────────────────────────────────────────────────
export async function addRelayAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const name = val(fd, "name");
  const url = val(fd, "url");
  await owned(stationId, user.id);
  if (!name || !url) redirect(`/dashboard/stations/${stationId}?tab=relays&error=Name+and+URL+required`);
  await db.relayStream.create({ data: { stationId, name, url } });
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function removeRelayAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const relayId = val(fd, "relayId");
  await owned(stationId, user.id);
  await db.relayStream.deleteMany({ where: { id: relayId, stationId } });
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function toggleRelayAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const relayId = val(fd, "relayId");
  const isActive = val(fd, "isActive") === "true";
  await owned(stationId, user.id);
  await db.relayStream.updateMany({ where: { id: relayId, stationId }, data: { isActive: !isActive } });
  revalidatePath(`/dashboard/stations/${stationId}`);
}

// ── Schedule blocks ───────────────────────────────────────────────
export async function addScheduleBlockAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const name = val(fd, "name");
  const dayOfWeek = parseInt(val(fd, "dayOfWeek"), 10);
  const startHour = parseInt(val(fd, "startHour"), 10);
  const startMin = parseInt(val(fd, "startMin") || "0", 10);
  const endHour = parseInt(val(fd, "endHour"), 10);
  const endMin = parseInt(val(fd, "endMin") || "0", 10);
  const playlistId = val(fd, "playlistId") || null;
  await owned(stationId, user.id);
  if (!name || isNaN(dayOfWeek) || isNaN(startHour) || isNaN(endHour)) {
    redirect(`/dashboard/stations/${stationId}?tab=schedule&error=All+fields+required`);
  }
  const sourceType: ScheduleSourceType = playlistId ? "PLAYLIST" : "RANDOM_ALL";
  await db.scheduleBlock.create({ data: { stationId, name, dayOfWeek, startHour, startMin, endHour, endMin, playlistId, sourceType } });
  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function removeScheduleBlockAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const blockId = val(fd, "blockId");
  await owned(stationId, user.id);
  await db.scheduleBlock.deleteMany({ where: { id: blockId, stationId } });
  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

// ── Recordings ────────────────────────────────────────────────────
export async function startRecordingAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  await owned(stationId, user.id);

  const active = await db.recording.findFirst({ where: { stationId, status: "recording" } });
  if (!active) {
    await db.recording.create({ data: { stationId, status: "recording" } });
  }
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function stopRecordingAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  await owned(stationId, user.id);

  const recording = await db.recording.findFirst({
    where: { stationId, status: "recording" },
    orderBy: { startedAt: "desc" },
  });
  if (recording) {
    await db.recording.update({
      where: { id: recording.id },
      data: { status: "done", endedAt: new Date() },
    });
  }
  revalidatePath(`/dashboard/stations/${stationId}`);
}

// ── Announcements ─────────────────────────────────────────────────
export async function addAnnouncementAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const title = val(fd, "title");
  const content = val(fd, "content");
  await owned(stationId, user.id);
  if (!title || !content) redirect(`/dashboard/stations/${stationId}?tab=settings&error=Title+and+content+required`);
  await db.announcement.create({ data: { stationId, title, content, active: true } });
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function removeAnnouncementAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const announcementId = val(fd, "announcementId");
  await owned(stationId, user.id);
  await db.announcement.deleteMany({ where: { id: announcementId, stationId } });
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function toggleAnnouncementAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const announcementId = val(fd, "announcementId");
  const active = val(fd, "active") === "true";
  await owned(stationId, user.id);
  await db.announcement.updateMany({ where: { id: announcementId, stationId }, data: { active: !active } });
  revalidatePath(`/dashboard/stations/${stationId}`);
}

// ── Geo-blocking: generate Icecast ACL file ───────────────────────
async function generateIcecastAcl(stationId: string) {
  try {
    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");

    const station = await db.station.findUnique({
      where: { id: stationId },
      include: { geoBlocks: true },
    });
    if (!station) return;

    const aclDir = process.env.ICECAST_ACL_DIR ?? "/app/icecast-acl";
    await mkdir(aclDir, { recursive: true });

    // Generate an Icecast2 <mount> ACL snippet
    // In production, the main icecast.xml includes this directory via XInclude
    const mount = station.mountPath.startsWith("/") ? station.mountPath : `/${station.mountPath}`;
    const blockedCodes = station.geoBlocks.map((b) => b.countryCode);

    const xmlLines = [
      `<!-- ACL for mount: ${mount} — auto-generated by OpenRadio -->`,
      `<mount type="normal">`,
      `  <mount-name>${mount}</mount-name>`,
    ];

    if (blockedCodes.length > 0) {
      xmlLines.push(`  <!-- Geo-blocking enforced by nginx+GeoIP or upstream proxy -->`);
      xmlLines.push(`  <!-- Blocked countries: ${blockedCodes.join(", ")} -->`);
      xmlLines.push(`  <access-log>access-${stationId}.log</access-log>`);
    }

    xmlLines.push(`  <max-listeners>0</max-listeners>`);
    xmlLines.push(`  <public>1</public>`);
    xmlLines.push(`</mount>`);

    await writeFile(
      path.join(aclDir, `${stationId}.xml`),
      xmlLines.join("\n") + "\n",
      "utf8"
    );
  } catch {
    // Non-fatal — ACL generation failure shouldn't block the UI
  }
}
