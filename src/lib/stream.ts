import { env } from "@/lib/env";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function normalizeMountPath(mountPath: string) {
  if (!mountPath) {
    return "/live.mp3";
  }

  return mountPath.startsWith("/") ? mountPath : `/${mountPath}`;
}

export function getPublicStreamUrl(mountPath: string) {
  const normalizedMountPath = normalizeMountPath(mountPath);

  // Prefer HLS for public playback when configured. This is the most reliable
  // path for iPhone/Safari while remaining compatible with Android and modern
  // browsers.
  if (env.STREAM_HLS_BASE_URL) {
    const base = trimTrailingSlash(env.STREAM_HLS_BASE_URL);
    const slug = normalizedMountPath.replace(/^\//, "").replace(/\.mp3$/i, "");
    return `${base}/${slug}/index.m3u8`;
  }

  const publicIcecastBase = env.SERVICE_URL_ICECAST || env.STREAM_PUBLIC_BASE_URL;

  // Prefer the public Icecast reverse proxy for non-HLS browser playback.
  if (publicIcecastBase && publicIcecastBase !== env.APP_BASE_URL) {
    return `${publicIcecastBase.replace(/\/$/, "")}${normalizedMountPath}`;
  }

  return `/stream${normalizedMountPath}`;
}

export function getPublicMp3StreamUrl(mountPath: string) {
  const normalizedMountPath = normalizeMountPath(mountPath);
  const publicIcecastBase = env.SERVICE_URL_ICECAST || env.STREAM_PUBLIC_BASE_URL;

  if (publicIcecastBase && publicIcecastBase !== env.APP_BASE_URL) {
    return `${publicIcecastBase.replace(/\/$/, "")}${normalizedMountPath}`;
  }

  return `/stream${normalizedMountPath}`;
}

export function getPublicHlsStreamUrl(mountPath: string) {
  if (!env.STREAM_HLS_BASE_URL) return null;
  const normalizedMountPath = normalizeMountPath(mountPath);
  const base = trimTrailingSlash(env.STREAM_HLS_BASE_URL);
  const slug = normalizedMountPath.replace(/^\//, "").replace(/\.mp3$/i, "");
  return `${base}/${slug}/index.m3u8`;
}

export function getSourceEndpoint(mountPath: string) {
  const normalizedMountPath = normalizeMountPath(mountPath);
  return {
    host: env.STREAM_SOURCE_HOST,
    port: env.ICECAST_SOURCE_PORT,
    mountPath: normalizedMountPath,
    sourceUrl: `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}${normalizedMountPath}`
  };
}
