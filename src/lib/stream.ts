import { env } from "@/lib/env";

export function normalizeMountPath(mountPath: string) {
  if (!mountPath) {
    return "/live.mp3";
  }

  return mountPath.startsWith("/") ? mountPath : `/${mountPath}`;
}

export function getPublicStreamUrl(mountPath: string) {
  const normalizedMountPath = normalizeMountPath(mountPath);
  const publicIcecastBase = env.SERVICE_URL_ICECAST || env.STREAM_PUBLIC_BASE_URL;

  // Prefer the public Icecast reverse proxy for browser playback. Sending live
  // audio through the Next.js /stream route adds another HTTP hop and can cause
  // audible stalls under production proxy/runtime buffering. If the configured
  // public base is the app itself, fall back to /stream to avoid recursion.
  if (publicIcecastBase && publicIcecastBase !== env.APP_BASE_URL) {
    return `${publicIcecastBase.replace(/\/$/, "")}${normalizedMountPath}`;
  }

  return `/stream${normalizedMountPath}`;
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
