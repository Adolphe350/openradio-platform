import { env } from "@/lib/env";

export function normalizeMountPath(mountPath: string) {
  if (!mountPath) {
    return "/live.mp3";
  }

  return mountPath.startsWith("/") ? mountPath : `/${mountPath}`;
}

export function getPublicStreamUrl(mountPath: string) {
  const normalizedMountPath = normalizeMountPath(mountPath);
  const base = env.STREAM_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${base}${normalizedMountPath}`;
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
