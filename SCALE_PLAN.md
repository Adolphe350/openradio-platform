# OpenRadio vs Zeno FM — Feature Gap Analysis & Scale Architecture

## Feature Comparison

| Feature | Zeno FM | OpenRadio (Current) | Status |
|---------|---------|--------------------|----|
| Live Broadcasting | ✅ Unlimited listeners | ✅ Icecast-based | ⚠️ Single instance |
| Auto-DJ (offline playlist) | ✅ Full | ⚠️ Partial (Liquidsoap blank) | 🔴 NEEDS FIX |
| Unlimited Bandwidth | ✅ CDN-backed | ❌ Single Icecast | 🔴 NEEDS ARCH |
| Analytics (listeners/geo) | ✅ 6 months | ⚠️ Basic metrics model | 🟡 PARTIAL |
| Monetization (ads) | ✅ Audio ads | ❌ Not implemented | 🟡 FUTURE |
| Podcast Hosting | ✅ Full | ❌ Not implemented | 🟡 FUTURE |
| Recording Live Shows | ✅ | ❌ | 🟡 FUTURE |
| Station Directory/Discovery | ✅ Full | ✅ Explore page | ✅ DONE |
| Embeddable Player Widget | ✅ | ✅ /embed/[slug] | ✅ DONE |
| Multi-relay | ✅ Unlimited relays | ✅ Relay model exists | ✅ DONE |
| Geo-blocking | ✅ | ✅ Geo-block model + nginx | ✅ DONE |
| Schedule-based playlists | ✅ | ✅ ScheduleBlock model | ✅ DONE |
| Track Upload | ✅ | ⚠️ Upload route (500 fix needed) | 🟡 PARTIAL |
| Playlist Management | ✅ | ✅ Full CRUD + ordering | ✅ DONE |
| Public Station Page | ✅ | ✅ /stations/[slug] | ✅ DONE |
| Mobile Apps | ✅ iOS + Android | ❌ | 🟡 FUTURE |
| Call-to-listen | ✅ (US only) | ❌ | ❌ SKIP |

## Critical Gaps for 24/7 Scale Operation

### 1. 🔴 AutoDJ Must Play Uploaded Tracks (NOT silence)
**Current:** Liquidsoap runs `blank()` because no files in /uploads volume
**Fix:** Liquidsoap must read track URLs from playlists and stream them

### 2. 🔴 Multi-Station Liquidsoap (thousands of stations)
**Current:** One Liquidsoap process per station = doesn't scale
**Fix:** Dynamic station spawning or single Liquidsoap with multiple outputs

### 3. 🔴 CDN/Relay for Millions of Listeners
**Current:** Single Icecast = max ~500 concurrent connections
**Fix:** Icecast relay tree + CDN (Cloudflare Stream / HLS)

### 4. 🔴 Persistent AutoDJ Config Generation
**Current:** Config write fails (filesystem issues in Docker)
**Fix:** Generate configs on station create/track add, write to shared volume

### 5. 🟡 Live vs AutoDJ Switching
**Current:** No fallback logic in Liquidsoap configs
**Fix:** Liquidsoap `fallback()` with live_input + playlist

## Architecture for Scale (Millions of Listeners)

```
                 ┌──────────────────┐
                 │   Cloudflare CDN  │ ← millions of listeners
                 │   (HLS / HTTPS)   │
                 └────────┬─────────┘
                          │
                 ┌────────┴─────────┐
                 │  Icecast Relays   │ ← horizontal scaling
                 │  (N instances)    │
                 └────────┬─────────┘
                          │
                 ┌────────┴─────────┐
                 │  Master Icecast   │ ← source connections only
                 └────────┬─────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
   ┌──────┴──────┐ ┌─────┴─────┐ ┌──────┴──────┐
   │ Liquidsoap  │ │Liquidsoap │ │ Live Source │
   │ AutoDJ Pool │ │ Station N │ │ (Encoder)  │
   └─────────────┘ └───────────┘ └────────────┘
          │
   ┌──────┴──────┐
   │  S3/MinIO   │ ← track file storage
   │  (shared)   │
   └─────────────┘
```

### Key Architecture Decisions:
1. **Track storage:** S3/MinIO (not local filesystem) — all containers can access
2. **AutoDJ:** Liquidsoap reads HTTP URLs from playlist files (supports remote files)
3. **Scaling:** Icecast relay tree — master accepts sources, relays serve listeners
4. **CDN:** Optional Cloudflare/Bunny CDN for global reach
5. **Station isolation:** Each station gets its own Liquidsoap process (or use harbors)
