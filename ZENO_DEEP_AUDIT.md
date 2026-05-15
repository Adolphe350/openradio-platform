# Zeno FM Deep Technical Audit — Complete Feature Specifications

**Audit Date:** 2026-05-15  
**Account:** irankundaadolphe@uwezoyouth.org (Uwezo Youth Empowerment)  
**Station:** CHANO 250 (key: `agxzfnplbm8tc3RhdHNyMgsSCkF1dGhDbGllbnQYgICI1s-n-wgMCxIOU3RhdGlvblByb2ZpbGUYgICIxZHI0AgMogEEemVubw`)  

---

## 1. ENCODER/BROADCAST SETTINGS (For RadioBoss, BUTT, OBS, etc.)

These are the exact fields shown to connect external broadcasting software:

| Field | Value (CHANO 250) | Description |
|-------|-------------------|-------------|
| **Server address** | `link.zeno.fm` | Icecast server hostname |
| **Port** | `80` | HTTP port (not standard 8000 — goes through their proxy) |
| **Mount point** | `mbpvux9ktnhvv/source` | Unique per-station mount |
| **Username** | `source` | Standard Icecast source username |
| **Mount password** | `5dL6Ap5w` | Random 8-char password (resettable) |
| **Encoding** | `MP3 or AAC` | Supported codecs |

### How it works with RadioBoss/BUTT:
1. Open RadioBoss → Settings → Encoder → Icecast
2. Server: `link.zeno.fm`
3. Port: `80`
4. Mount: `mbpvux9ktnhvv/source`
5. Username: `source`
6. Password: `5dL6Ap5w`
7. Format: MP3 128kbps (or AAC)
8. Click "Connect" → You're live!

When encoder connects → **Live stream takes priority over AutoDJ**  
When encoder disconnects → **AutoDJ resumes automatically**

---

## 2. STREAM URLs (3 Formats)

| Format | URL |
|--------|-----|
| **MAIN** (Direct) | `https://stream.zeno.fm/a9kfyx9ktnhvv` |
| **M3U** (Playlist) | `https://stream.zeno.fm/a9kfyx9ktnhvv.m3u` |
| **PLS** (Playlist) | `https://stream.zeno.fm/a9kfyx9ktnhvv.pls` |

### URL Structure:
- Stream hash: `a9kfyx9ktnhvv` (derived from station key)
- CDN redirect: Main URL → `stream-178.zeno.fm/hash?zt=<JWT>` (JWT expires ~60s)
- M3U file contains: `https://stream.zeno.fm/a9kfyx9ktnhvv`
- PLS file contains: same URL in PLS format

---

## 3. CREATE STATION FORM

| Field | Type | Required | Options/Validation |
|-------|------|----------|-------------------|
| **Station Name** | text input | Yes | Free text |
| **Logo** | file upload | No | Accept: `image/jpeg,image/png,image/webp`, 500x500–3000x3000px, max 1MB |
| **Genre** | searchable dropdown | Yes | General, Music, News, Talk, Sports, Religious, Hip-Hop, Pop, Rock, Electronic, Jazz, Classical, R&B, Country, Reggae, Latin, Comedy, Education, Kids, etc. |
| **Country** | searchable dropdown | Yes | All countries (Rwanda preselected for this account) |
| **Website URL** | text | No | `https://website.com/` placeholder |

**Limitation:** Free plan allows max 2 stations. "Upgrade to add new stations" shown.

---

## 4. AUTO DJ

### Dashboard Shows:
- **Auto DJ %** — percentage of time AutoDJ vs Live (e.g., "Auto Dj 0%")
- **Sessions** — up/down from last week
- **Countries** — unique listener countries
- **Total Listeners** — current count

### AutoDJ Workflow:
1. Upload audio files to station library
2. Files auto-added to rotation playlist
3. When broadcaster is offline → AutoDJ plays tracks in random/sequential order
4. When broadcaster connects → Live takes over immediately
5. Shuffle toggle available
6. Reset AutoDJ available (restarts rotation)

### Buttons Available:
- Upload files
- Shuffle
- Reset
- Delete tracks from rotation

---

## 5. ANALYTICS

### Analytics Tabs:
| Tab | Features |
|-----|----------|
| **Live** | Real-time map, current listeners, countries count, per-station filter |
| **Streaming** | Historical data, date range picker, "Group by station" toggle, compare periods |
| **Podcasts** | Episode play analytics |
| **Call-in** | CTL usage stats |

### Live Analytics:
- **All Station / Per-station filter** dropdown
- **Countries count** — real-time unique countries
- **Total Listeners** — real-time number
- World map visualization (implied by "Loading..." with map context)

### Streaming Analytics:
- **Date range picker:** Calendar UI with month/year navigation
- **Period comparison:** "Compare" toggle to compare two date ranges
- **Group by station:** Shows breakdown per station
- **"Yesterday" quick pick** shortcut
- **"Get Analytics" button** — loads the chart/data for selected range
- **Chart:** Line chart (ApexCharts) showing listeners over time
- Chart shows: This week vs Last week overlay

### Dashboard Home Stats:
- **Total listeners This Week:** 161
- **Total listeners Last Week:** 165
- Line chart comparing this week vs last week
- "Recent Updates" news section (Zeno announcements, webinar replays, etc.)

---

## 6. STATION SETTINGS TAB

### Station Overview Section:
- **Broadcast settings button** — opens encoder credentials panel
- **Stream URLs** — MAIN / M3U / PLS (read-only copy fields)
- **Zeno.FM Announcements:**
  - Title (text input)
  - Content (text input)
  - "Create" button
  - Active announcements list with toggle/delete

### Station Info Section (implied from Settings navigation):
- Station name edit
- Logo change
- Genre change
- Country change
- Description edit
- Website URL edit
- Stream description

---

## 7. WIDGET/EMBED

Widget page provides embeddable player code:
- HTML iframe embed code
- Customizable player (size, colors likely)
- Copy-to-clipboard functionality

---

## 8. CTL (CALL-TO-LISTEN)

- Phone number assigned per station
- Listeners call the number to hear stream without internet
- USA-only feature
- Usage analytics in the Call-in analytics tab

---

## 9. PLANS & PRICING (DETAILED)

| Feature | Free | Starter ($14/mo) | Prime ($25/mo) | Premier ($115/mo) |
|---------|------|-------------------|----------------|-------------------|
| **Stations** | 2 | 1 | 3 | 5 |
| **Trial** | — | 7 days | — | — |
| **Concurrent Listeners** | ? | 5,000 | 25,000 | Unlimited |
| **Bandwidth** | ? | Unlimited | Unlimited | Unlimited |
| **Total Listening Hours** | ? | 400k | 1M | 2.5M |
| **Streaming Quality** | 128 kbps | 128 kbps | 192 kbps | 320 kbps |
| **Podcast Hosting** | ? | Included | Included | Included |
| **Analytics Retention** | ? | ? | 6 months | 12+ months |

- **Monthly/Yearly toggle** — Yearly saves 50%
- **Promo code field** — "Add promo code" with apply button
- **MAY Secret Sale** — 50% off countdown timer

---

## 10. PODCASTS

### Create Podcast Form:
- Multiple text inputs (name, description, category, etc.)
- Separate from station management
- RSS feed auto-generated
- Distribution to Apple Podcasts, Spotify

### Podcast Features:
- Episode upload
- Episode metadata (title, description, date)
- RSS feed URL for distribution
- Analytics per episode
- Linked to station (can appear on station page)

---

## 11. PEOPLE (TEAM)

- **Invite by email** — text input for email
- **Role:** Admin
- **Team member table:** Avatar, Name, Email, Role(s)
- Invite user to join account with admin role

---

## 12. WHAT OPENRADIO MUST IMPLEMENT FOR FULL PARITY

### Critical (encoder connectivity — RadioBoss, BUTT, etc.):
1. ✅ Icecast encoder settings clearly displayed (server, port, mount, user, password)
2. ✅ Password reset functionality
3. ✅ Encoding format info (MP3 or AAC)
4. 🔴 **Port 80 proxy** — Zeno uses port 80 for source connections (many corporate firewalls block 8000)

### Stream URLs:
5. ✅ Main stream URL (HTTPS)
6. 🔴 M3U format URL (`.m3u` appended)
7. 🔴 PLS format URL (`.pls` appended)
8. ✅ Stream proxy through app HTTPS

### AutoDJ:
9. ✅ Upload tracks
10. ✅ Auto-play when offline
11. ✅ Live → AutoDJ fallback
12. 🔴 **AutoDJ % display** (ratio of autodj vs live time)
13. 🔴 **Shuffle/Reset controls** (explicit UI buttons)

### Analytics:
14. 🔴 **Live real-time map** with country breakdown
15. 🔴 **Historical date picker** with period comparison
16. 🔴 **Group by station** toggle
17. 🔴 **Line chart** (ApexCharts or similar) this week vs last week
18. 🔴 **Dashboard home stats** — total listeners this/last week with chart

### Plans/Monetization:
19. 🟡 **Listening hours limit** (for hosted version)
20. 🟡 **Streaming quality tiers** (128/192/320 kbps)
21. 🟡 **Concurrent listener limits** per plan

### Other:
22. ✅ Announcements (title + content)
23. ✅ Team management (invite by email)
24. 🟡 Podcast hosting
25. 🟡 Recording
