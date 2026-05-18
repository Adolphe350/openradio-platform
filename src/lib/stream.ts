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

function getAppBaseUrl() {
  return trimTrailingSlash(env.APP_BASE_URL);
}

function getPublicHlsBase() {
  const configured = env.STREAM_HLS_BASE_URL ? trimTrailingSlash(env.STREAM_HLS_BASE_URL) : null;

  // When a real HLS asset/CDN origin is configured, use it directly. If the
  // value points to this app's proxy route (or is unset), display the branded
  // OpenRadio domain instead of Coolify's generated service domains.
  if (configured && !configured.endsWith("/api/hls")) {
    return configured;
  }

  return `${getAppBaseUrl()}/api/hls`;
}

function getPublicMp3Base() {
  // For listener-facing dashboard URLs, prefer the branded app domain and its
  // `/stream` proxy. SERVICE_URL_ICECAST is a generated Coolify service URL and
  // should not be shown as the public station broadcast URL.
  return `${getAppBaseUrl()}/stream`;
}

export function getPublicStreamUrl(mountPath: string) {
  return getPublicHlsStreamUrl(mountPath);
}

export function getPublicMp3StreamUrl(mountPath: string) {
  const normalizedMountPath = normalizeMountPath(mountPath);
  return `${getPublicMp3Base()}${normalizedMountPath}`;
}

export function getPublicHlsStreamUrl(mountPath: string) {
  const normalizedMountPath = normalizeMountPath(mountPath);
  const slug = normalizedMountPath.replace(/^\//, "").replace(/\.mp3$/i, "");
  return `${getPublicHlsBase()}/${slug}/index.m3u8`;
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
