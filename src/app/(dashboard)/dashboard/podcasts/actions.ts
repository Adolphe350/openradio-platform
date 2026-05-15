"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

function val(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

async function generateUniquePodcastSlug(title: string) {
  const base = slugify(title) || "podcast";
  let candidate = base;
  let counter = 1;
  while (true) {
    const exists = await db.podcast.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
}

export async function createPodcastAction(fd: FormData) {
  const user = await requireUser();
  const title = val(fd, "title");
  const description = val(fd, "description") || null;
  const author = val(fd, "author") || user.name;
  const language = val(fd, "language") || "en";
  const category = val(fd, "category") || null;

  if (title.length < 2) {
    redirect("/dashboard/podcasts?error=Title+must+be+at+least+2+characters");
  }

  const slug = await generateUniquePodcastSlug(title);

  const podcast = await db.podcast.create({
    data: {
      ownerId: user.id,
      title,
      slug,
      description,
      author,
      language,
      category,
    },
  });

  revalidatePath("/dashboard/podcasts");
  redirect(`/dashboard/podcasts/${podcast.id}`);
}

export async function deletePodcastAction(fd: FormData) {
  const user = await requireUser();
  const podcastId = val(fd, "podcastId");

  await db.podcast.deleteMany({ where: { id: podcastId, ownerId: user.id } });
  revalidatePath("/dashboard/podcasts");
  redirect("/dashboard/podcasts");
}

export async function createEpisodeAction(fd: FormData) {
  const user = await requireUser();
  const podcastId = val(fd, "podcastId");
  const title = val(fd, "title");
  const description = val(fd, "description") || null;
  const fileUrl = val(fd, "fileUrl") || null;
  const durationRaw = val(fd, "durationSec");

  const podcast = await db.podcast.findFirst({ where: { id: podcastId, ownerId: user.id } });
  if (!podcast) {
    redirect("/dashboard/podcasts?error=Podcast+not+found");
  }

  if (title.length < 1) {
    redirect(`/dashboard/podcasts/${podcastId}?error=Title+is+required`);
  }

  await db.episode.create({
    data: {
      podcastId,
      title,
      description,
      fileUrl,
      durationSec: durationRaw ? Number(durationRaw) : null,
    },
  });

  revalidatePath(`/dashboard/podcasts/${podcastId}`);
}

export async function deleteEpisodeAction(fd: FormData) {
  const user = await requireUser();
  const podcastId = val(fd, "podcastId");
  const episodeId = val(fd, "episodeId");

  const podcast = await db.podcast.findFirst({ where: { id: podcastId, ownerId: user.id } });
  if (!podcast) return;

  await db.episode.deleteMany({ where: { id: episodeId, podcastId } });
  revalidatePath(`/dashboard/podcasts/${podcastId}`);
}
