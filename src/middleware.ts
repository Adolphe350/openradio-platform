import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter for auth endpoints
const authAttempts = new Map<string, { count: number; windowStart: number }>();
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_ATTEMPTS = 10; // max 10 attempts per 15 min window

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);

  if (!entry || now - entry.windowStart > AUTH_WINDOW_MS) {
    authAttempts.set(ip, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > AUTH_MAX_ATTEMPTS) {
    return true;
  }

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit auth form submissions (POST to sign-in/sign-up)
  if (
    req.method === "POST" &&
    (pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/forgot-password")
  ) {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      const url = req.nextUrl.clone();
      url.searchParams.set("error", "Too many attempts. Please try again later.");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sign-in", "/sign-up", "/forgot-password"],
};
