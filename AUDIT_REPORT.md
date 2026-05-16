# OpenRadio Web App Audit Report
**Date:** 2026-05-15  
**URL:** https://openradio.iraady.com  
**Repo:** Adolphe350/openradio-platform  

---

## ✅ Test Results Summary

| Area | Status | Notes |
|------|--------|-------|
| Landing page | ✅ Pass | Loads fast (195ms), proper title/meta |
| Sign-up | ✅ Pass | Creates account, redirects to dashboard |
| Sign-in | ✅ Pass | Auth works, session cookie set properly |
| Session persistence | ✅ Pass | Cookie: httpOnly, secure, sameSite=Lax |
| Dashboard | ✅ Pass | Shows stats, stations, checklist |
| Create Station | ✅ Pass | Form works with all fields |
| Settings | ✅ Pass | Profile edit + password change |
| Analytics | ✅ Pass | Page loads |
| Explore | ✅ Pass | Search + filters work |
| Public station page | ✅ Pass | Player, metadata, related stations |
| Audio player | ✅ Pass | Proper error handling, volume control |
| File upload | ✅ Pass | XHR with progress, size/type validation |
| Forgot password | ✅ Pass | Proper token flow, doesn't reveal emails |
| Reset password | ✅ Pass | Invalidates all sessions after reset |
| 404 page | ✅ Pass | Custom branded page |
| API /health | ✅ Pass | Returns 200 |
| API /explore | ✅ Pass | Returns station data |
| API /now-playing | ✅ Pass | Returns mount status |
| Responsive (mobile) | ✅ Pass | Renders on 375px viewport |

---

## 🐛 Issues Found & Fixed

### CRITICAL — Fixed ✅
1. **Logo branding "Z" instead of "O"** — All logo icons across header, footer, sidebar, auth pages, and email templates showed "Z" (leftover from Zeno inspiration). Fixed to "O" for OpenRadio.

### HIGH — Fixed ✅  
2. **metadataBase set to localhost** — `openradio-cloud.local` in layout.tsx caused broken OG/meta URLs in production. Fixed to use `APP_BASE_URL` env or fallback to `openradio.iraady.com`.
3. **No security headers** — No X-Frame-Options, X-Content-Type-Options, or Referrer-Policy. Added via `next.config.ts` headers.
4. **No rate limiting on auth** — Sign-in/sign-up/forgot-password endpoints had no brute-force protection. Added middleware: 10 attempts per 15-minute window per IP.
5. **Email template had "Z" logo** — Password reset emails contained the old Z branding. Fixed.

### MEDIUM — Fixed ✅
6. **CSS comments referenced "Zeno"** — Comments like "Zeno-style Design Tokens" and "Zeno teal" cleaned up.
7. **Missing viewport meta** — No explicit viewport/themeColor export. Added proper Next.js Viewport export.
8. **Missing OpenGraph defaults** — No site-level OG meta. Added type, siteName, title, description.

---

## 🔒 Security Assessment

| Check | Status |
|-------|--------|
| Password hashing | ✅ bcrypt, 12 rounds |
| Password validation | ✅ Min 8 chars, uppercase, lowercase, number |
| Session tokens | ✅ SHA-256 hashed, 30-day TTL |
| Cookie security | ✅ httpOnly, secure, sameSite=lax |
| Path traversal prevention | ✅ File routes use `path.basename()` |
| Input validation | ✅ Zod schemas for auth + forms |
| SQL injection | ✅ Prisma ORM (parameterized) |
| IDOR protection | ✅ All station ops check `ownerId` |
| Email enumeration | ✅ Forgot-password doesn't reveal registration |
| Session invalidation on password reset | ✅ All sessions deleted |
| Upload size limit | ✅ 50MB max, MIME type whitelist |
| Rate limiting | ✅ Added (10 attempts/15min/IP) |
| Security headers | ✅ Added X-Frame-Options, nosniff, etc. |
| CSRF | ⚠️ Relies on SameSite=Lax + server actions (acceptable for Next.js) |

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Landing page load | ~195ms |
| Time to dashboard after login | ~2s |
| API health response | ~50ms |
| Console errors | 0 (on valid pages) |
| Network 4xx/5xx errors | 0 (on valid pages) |

---

## 🏗️ Architecture Quality

**Strengths:**
- Clean Next.js App Router architecture with proper server/client separation
- Well-structured Prisma schema with proper indexes and cascading deletes
- Good separation of concerns (lib/, components/, api/)
- Proper use of server actions for form submissions
- File upload with progress tracking (XHR)
- Station config generation (Liquidsoap/Icecast/nginx)
- Good explore page with search, filters, sorting

**Observations:**
- Audio file serving (`/api/stations/[id]/files/[name]`) is publicly accessible without auth — this is correct for a radio platform (files need to be streamable)
- The `NowPlaying` component polls Icecast status with 10s cache — efficient
- Docker Compose setup is Coolify-friendly (standalone output)

---

## 📝 Recommendations (Not Yet Implemented)

1. **Add account deletion** — Settings page has no "Delete Account" option
2. **Add email verification** — Signups don't verify email addresses
3. **Add session management UI** — Users can't see/revoke active sessions
4. **Add CAPTCHA on signup** — Prevent bot account creation
5. **Add CSP header** — Content-Security-Policy for XSS prevention
6. **Add logging/monitoring** — No structured logging for auth failures
7. **Mobile nav hamburger** — Header nav items overflow on mobile (no responsive menu toggle)
8. **Add favicon** — No favicon.ico or site icon configured

---

## Changes Committed

**Commit:** `7c4f290` pushed to `main`  
**Files changed:** 12 (11 modified + 1 new middleware)
