import { Prisma, StationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { resolveStationMetric } from "@/lib/analytics";
import { getPublicStreamUrl } from "@/lib/stream";

export const discoverableStationStatuses: StationStatus[] = ["ACTIVE", "PAUSED"];

export type ExploreSort = "trending" | "recent" | "name";

export type ExploreQueryInput = {
  q?: string;
  genre?: string;
  language?: string;
  country?: string;
  sort?: ExploreSort;
  limit?: number;
  excludeStationId?: string;
};

export type ExploreStation = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  genre: string | null;
  language: string;
  country: string | null;
  status: StationStatus;
  mountPath: string;
  streamUrl: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  trackCount: number;
  playlistCount: number;
  currentListeners: number;
  peakListeners: number;
  totalListeningHours: number;
  uptimePercent: number;
  storageUsedMb: number;
  metricSource: "live" | "sample";
};

type SearchParamsLike = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) ? value[0] : undefined;
}

function cleanValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseExploreSearchParams(searchParams: SearchParamsLike): ExploreQueryInput {
  const sortCandidate = firstValue(searchParams.sort);
  const limitCandidate = Number(firstValue(searchParams.limit));

  return {
    q: cleanValue(firstValue(searchParams.q)),
    genre: cleanValue(firstValue(searchParams.genre)),
    language: cleanValue(firstValue(searchParams.language)),
    country: cleanValue(firstValue(searchParams.country)),
    sort:
      sortCandidate === "name" || sortCandidate === "recent" || sortCandidate === "trending"
        ? sortCandidate
        : undefined,
    limit: Number.isFinite(limitCandidate) && limitCandidate > 0 ? Math.floor(limitCandidate) : undefined
  };
}

function buildExploreWhere(input: ExploreQueryInput): Prisma.StationWhereInput {
  const clauses: Prisma.StationWhereInput[] = [
    {
      status: {
        in: discoverableStationStatuses
      }
    }
  ];

  if (input.excludeStationId) {
    clauses.push({ id: { not: input.excludeStationId } });
  }

  if (input.q) {
    clauses.push({
      OR: [
        { name: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
        { genre: { contains: input.q, mode: "insensitive" } }
      ]
    });
  }

  if (input.genre) {
    clauses.push({ genre: { equals: input.genre, mode: "insensitive" } });
  }

  if (input.language) {
    clauses.push({ language: { equals: input.language, mode: "insensitive" } });
  }

  if (input.country) {
    clauses.push({ country: { equals: input.country, mode: "insensitive" } });
  }

  return {
    AND: clauses
  };
}

export async function getExploreStations(input: ExploreQueryInput = {}) {
  const sort = input.sort ?? "trending";
  const limit = Math.min(Math.max(input.limit ?? 24, 1), 80);

  const fetchLimit = sort === "trending" ? Math.max(limit * 3, 30) : limit;

  const stations = await db.station.findMany({
    where: buildExploreWhere(input),
    include: {
      _count: {
        select: {
          tracks: true,
          playlists: true
        }
      },
      metrics: {
        orderBy: {
          sampledAt: "desc"
        },
        take: 1
      }
    },
    orderBy: sort === "name" ? { name: "asc" } : { updatedAt: "desc" },
    take: fetchLimit
  });

  const summaries: ExploreStation[] = stations.map((station) => {
    const metricResult = resolveStationMetric({
      stationId: station.id,
      trackCount: station._count.tracks,
      playlistCount: station._count.playlists,
      createdAt: station.createdAt,
      metric: station.metrics[0]
        ? {
            currentListeners: station.metrics[0].currentListeners,
            peakListeners: station.metrics[0].peakListeners,
            totalListeningHours: station.metrics[0].totalListeningHours,
            uptimePercent: station.metrics[0].uptimePercent,
            storageUsedMb: station.metrics[0].storageUsedMb,
            sampledAt: station.metrics[0].sampledAt
          }
        : null
    });

    return {
      id: station.id,
      slug: station.slug,
      name: station.name,
      description: station.description,
      genre: station.genre,
      language: station.language,
      country: station.country,
      status: station.status,
      mountPath: station.mountPath,
      streamUrl: getPublicStreamUrl(station.mountPath),
      logoUrl: station.logoUrl,
      createdAt: station.createdAt,
      updatedAt: station.updatedAt,
      trackCount: station._count.tracks,
      playlistCount: station._count.playlists,
      currentListeners: metricResult.metric.currentListeners,
      peakListeners: metricResult.metric.peakListeners,
      totalListeningHours: metricResult.metric.totalListeningHours,
      uptimePercent: metricResult.metric.uptimePercent,
      storageUsedMb: metricResult.metric.storageUsedMb,
      metricSource: metricResult.source
    };
  });

  if (sort === "trending") {
    summaries.sort((left, right) => {
      if (right.currentListeners !== left.currentListeners) {
        return right.currentListeners - left.currentListeners;
      }

      if (right.peakListeners !== left.peakListeners) {
        return right.peakListeners - left.peakListeners;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }

  if (sort === "name") {
    summaries.sort((left, right) => left.name.localeCompare(right.name));
  }

  if (sort === "recent") {
    summaries.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  return summaries.slice(0, limit);
}

export async function getExploreFilters() {
  const baseWhere: Prisma.StationWhereInput = {
    status: {
      in: discoverableStationStatuses
    }
  };

  const [genresRaw, languagesRaw, countriesRaw] = await Promise.all([
    db.station.findMany({
      where: {
        ...baseWhere,
        genre: { not: null }
      },
      select: { genre: true },
      distinct: ["genre"],
      orderBy: { genre: "asc" }
    }),
    db.station.findMany({
      where: baseWhere,
      select: { language: true },
      distinct: ["language"],
      orderBy: { language: "asc" }
    }),
    db.station.findMany({
      where: {
        ...baseWhere,
        country: { not: null }
      },
      select: { country: true },
      distinct: ["country"],
      orderBy: { country: "asc" }
    })
  ]);

  return {
    genres: genresRaw.map((item) => item.genre).filter((value): value is string => Boolean(value)),
    languages: languagesRaw.map((item) => item.language).filter((value): value is string => Boolean(value)),
    countries: countriesRaw.map((item) => item.country).filter((value): value is string => Boolean(value))
  };
}

export async function getRelatedStations(input: {
  stationId: string;
  genre: string | null;
  language: string;
  country: string | null;
  limit?: number;
}) {
  const limit = input.limit ?? 4;

  const relatedCandidates = await getExploreStations({
    excludeStationId: input.stationId,
    genre: input.genre ?? undefined,
    language: input.language,
    country: input.country ?? undefined,
    sort: "trending",
    limit: limit * 2
  });

  const unique = new Map<string, ExploreStation>();

  for (const station of relatedCandidates) {
    unique.set(station.id, station);

    if (unique.size >= limit) {
      break;
    }
  }

  if (unique.size < limit) {
    const fallback = await getExploreStations({
      excludeStationId: input.stationId,
      sort: "recent",
      limit: limit * 3
    });

    for (const station of fallback) {
      if (!unique.has(station.id)) {
        unique.set(station.id, station);
      }

      if (unique.size >= limit) {
        break;
      }
    }
  }

  return Array.from(unique.values()).slice(0, limit);
}
