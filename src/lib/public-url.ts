import { NextRequest } from "next/server";

function normalizeHost(host: string | null): string | null {
  if (!host) return null;
  const first = host.split(",")[0]?.trim();
  return first || null;
}

function normalizeProto(proto: string | null): string {
  const first = proto?.split(",")[0]?.trim().toLowerCase();
  return first === "http" || first === "https" ? first : "https";
}

export function getRequestOrigin(req: NextRequest): string {
  const forwardedHost = normalizeHost(req.headers.get("x-forwarded-host"));
  const forwardedProto = normalizeProto(req.headers.get("x-forwarded-proto"));

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = normalizeHost(req.headers.get("host"));
  if (host) {
    const protocol = req.nextUrl.protocol?.replace(/:$/, "") || forwardedProto;
    return `${protocol}://${host}`;
  }

  return req.nextUrl.origin;
}
