import { NextResponse } from "next/server";

import { getExploreStations, parseExploreSearchParams } from "@/lib/explore";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseExploreSearchParams({
    q: url.searchParams.get("q") ?? undefined,
    genre: url.searchParams.get("genre") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined
  });

  const stations = await getExploreStations({
    ...params,
    limit: params.limit ?? 24
  });

  return NextResponse.json({
    filters: {
      q: params.q ?? null,
      genre: params.genre ?? null,
      language: params.language ?? null,
      country: params.country ?? null,
      sort: params.sort ?? "trending",
      limit: params.limit ?? 24
    },
    stations
  });
}
