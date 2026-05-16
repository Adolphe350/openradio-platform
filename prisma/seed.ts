import crypto from "crypto";

import { PrismaClient, StationStatus } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function seedPlans() {
  const plans = [
    {
      id: "plan_free",
      name: "Free",
      slug: "free",
      price: 0,
      interval: "monthly",
      maxStations: 2,
      maxListeners: 500,
      maxListeningHours: null as number | null,
      maxBitrate: 128,
      features: ["2 stations", "500 concurrent listeners", "128 kbps quality", "AutoDJ + scheduling", "Basic analytics"],
    },
    {
      id: "plan_starter",
      name: "Starter",
      slug: "starter",
      price: 14,
      interval: "monthly",
      maxStations: 5,
      maxListeners: 5000,
      maxListeningHours: 400000 as number | null,
      maxBitrate: 128,
      features: ["5 stations", "5,000 concurrent listeners", "128 kbps quality", "400k listening hours/month", "Full analytics"],
    },
    {
      id: "plan_pro",
      name: "Pro",
      slug: "pro",
      price: 25,
      interval: "monthly",
      maxStations: 15,
      maxListeners: 25000,
      maxListeningHours: 1000000 as number | null,
      maxBitrate: 192,
      features: ["15 stations", "25,000 concurrent listeners", "192 kbps quality", "1M listening hours/month", "Priority support"],
    },
    {
      id: "plan_premier",
      name: "Premier",
      slug: "premier",
      price: 115,
      interval: "monthly",
      maxStations: null as number | null,
      maxListeners: null as number | null,
      maxListeningHours: null as number | null,
      maxBitrate: 320,
      features: ["Unlimited stations", "Unlimited listeners", "320 kbps quality", "2.5M listening hours/month", "Enterprise support"],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        price: plan.price,
        maxStations: plan.maxStations,
        maxListeners: plan.maxListeners,
        maxListeningHours: plan.maxListeningHours,
        maxBitrate: plan.maxBitrate,
        features: plan.features,
      },
      create: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        price: plan.price,
        interval: plan.interval,
        maxStations: plan.maxStations,
        maxListeners: plan.maxListeners,
        maxListeningHours: plan.maxListeningHours,
        maxBitrate: plan.maxBitrate,
        features: plan.features,
      },
    });
  }
  console.log("Plans seeded");
}

async function main() {
  await seedPlans();
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
