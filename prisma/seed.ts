import crypto from "crypto";

import { PrismaClient, StationStatus } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const demoEmail = "demo@openradio.cloud";
  const demoPassword = "OpenRadio123!";

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: "Demo Broadcaster"
    },
    create: {
      email: demoEmail,
      name: "Demo Broadcaster",
      passwordHash: await hashPassword(demoPassword)
    }
  });

  const sourcePassword = crypto.randomBytes(10).toString("hex");

  const station = await prisma.station.upsert({
    where: { slug: "city-sunset-radio" },
    update: {},
    create: {
      ownerId: demoUser.id,
      name: "City Sunset Radio",
      slug: "city-sunset-radio",
      description: "Eclectic indie, mellow electronica, and daily live talks for city listeners.",
      genre: "Indie / Chill",
      language: "English",
      timezone: "UTC",
      country: "US",
      status: StationStatus.ACTIVE,
      mountPath: "/city-sunset.mp3",
      sourceUsername: "source",
      sourcePassword
    }
  });

  const [trackOne, trackTwo] = await Promise.all([
    prisma.track.upsert({
      where: {
        id: "cm_seed_track_001"
      },
      update: {},
      create: {
        id: "cm_seed_track_001",
        stationId: station.id,
        createdByUserId: demoUser.id,
        title: "Midnight Boulevard",
        artist: "Neon Atlas",
        album: "City Transit",
        durationSec: 238,
        fileUrl: "https://example.com/audio/midnight-boulevard.mp3"
      }
    }),
    prisma.track.upsert({
      where: {
        id: "cm_seed_track_002"
      },
      update: {},
      create: {
        id: "cm_seed_track_002",
        stationId: station.id,
        createdByUserId: demoUser.id,
        title: "Blue Hour Signals",
        artist: "Harbor Loop",
        album: "Downtown Air",
        durationSec: 214,
        fileUrl: "https://example.com/audio/blue-hour-signals.mp3"
      }
    })
  ]);

  const playlist = await prisma.playlist.upsert({
    where: {
      stationId_name: {
        stationId: station.id,
        name: "Main Rotation"
      }
    },
    update: {},
    create: {
      stationId: station.id,
      createdById: demoUser.id,
      name: "Main Rotation",
      description: "Core AutoDJ playlist",
      isDefault: true
    }
  });

  await prisma.playlistTrack.upsert({
    where: {
      playlistId_trackId: {
        playlistId: playlist.id,
        trackId: trackOne.id
      }
    },
    update: {
      position: 1
    },
    create: {
      playlistId: playlist.id,
      trackId: trackOne.id,
      position: 1
    }
  });

  await prisma.playlistTrack.upsert({
    where: {
      playlistId_trackId: {
        playlistId: playlist.id,
        trackId: trackTwo.id
      }
    },
    update: {
      position: 2
    },
    create: {
      playlistId: playlist.id,
      trackId: trackTwo.id,
      position: 2
    }
  });

  await prisma.listenerMetric.create({
    data: {
      stationId: station.id,
      currentListeners: 38,
      peakListeners: 124,
      totalListeningHours: 312.7,
      uptimePercent: 99.2,
      storageUsedMb: 890
    }
  });

  console.log("Seed completed");
  console.log(`Demo login -> email: ${demoEmail}, password: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
