import { env } from "@/lib/env";

export type IcecastSource = {
  mount?: string;
  listeners: number;
  listener_peak: number;
  title?: string;
  song?: string;
  artist?: string;
  server_name?: string;
  listenurl?: string;
};

export type IcecastStatus = {
  icestats?: {
    source?: IcecastSource | IcecastSource[];
  };
};

export function normalizeIcecastMount(mountPath: string) {
  return mountPath.startsWith("/") ? mountPath : `/${mountPath}`;
}

export function normalizeIcecastSources(raw: IcecastSource | IcecastSource[] | undefined): IcecastSource[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function normalizeMountCandidate(value: string | undefined | null) {
  if (!value) return null;

  try {
    const parsed = value.startsWith("http://") || value.startsWith("https://")
      ? new URL(value).pathname
      : value;
    return normalizeIcecastMount(decodeURIComponent(parsed).trim());
  } catch {
    return normalizeIcecastMount(value.trim());
  }
}

export function getIcecastSourceMounts(source: IcecastSource) {
  const candidates = [source.mount, source.listenurl]
    .map(normalizeMountCandidate)
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates.flatMap((value) => [value, value.replace(/^\//, "")])));
}

export function findIcecastSource(sources: IcecastSource[], mountPath: string) {
  const mount = normalizeIcecastMount(mountPath);
  const unprefixed = mount.replace(/^\//, "");

  return sources.find((source) => {
    const sourceMounts = getIcecastSourceMounts(source);
    return sourceMounts.includes(mount) || sourceMounts.includes(unprefixed);
  }) ?? null;
}

export async function fetchIcecastStatus(timeoutMs = 5000): Promise<IcecastStatus | null> {
  try {
    const base = `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}`;
    const res = await fetch(`${base}/status-json.xsl`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as IcecastStatus;
  } catch {
    return null;
  }
}
