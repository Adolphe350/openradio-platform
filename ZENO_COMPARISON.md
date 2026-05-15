# Zeno FM Complete Feature Audit & Comparison with OpenRadio

**Audit Date:** 2026-05-15  
**Zeno Account:** irankundaadolphe@uwezoyouth.org (Uwezo Youth Empowerment)  
**Stations on account:** CHANO 250, Uwezo media station  
**Current listeners this week:** 161  

---

## ZENO FM COMPLETE FEATURE MAP

### 1. Dashboard (Home)
- **Welcome message** with user name
- **Total listeners chart** — This Week vs Last Week comparison
- **ApexCharts** graph visualization (line chart)
- **Quick stats:** Sessions, Countries, Total Listeners
- **Sidebar navigation** — persistent across all pages

### 2. Station Management

#### 2.1 Station Detail Page (Tabs)
| Tab | Purpose |
|-----|---------|
| **Overview** | Stats, broadcast settings, stream URLs |
| **Auto DJ** | Upload tracks, manage playlist rotation |
| **Podcasts** | Podcast episodes linked to station |
| **Widget** | Embeddable player code generator |
| **CTL** | Call-To-Listen (phone dial-in number) |
| **Settings** | Station info, genre, country, logo, delete |

#### 2.2 Broadcast Settings Panel
- **Stream URLs:** MAIN / M3U / PLS formats provided
- **Encoder Settings (Icecast compatible):**
  - Server address
  - Port
  - Mount point
  - Username
  - Mount password (with reset option)
  - Encoding format

#### 2.3 Stream Infrastructure
- Stream URLs: `https://stream.zeno.fm/<stationHash>`
- **CDN with JWT tokens:** Redirects to `stream-178.zeno.fm/<hash>?zt=<JWT>`
- JWT expires in ~60 seconds (short-lived for anti-hotlinking)
- Multiple stream edge servers (`stream-178`, `stream-XXX`)
- Supports: MAIN stream, M3U playlist file, PLS playlist file

#### 2.4 AutoDJ
- Upload audio tracks to station library
- Tracks play automatically when broadcaster is offline
- Shuffle/sequential modes
- Shows "Auto DJ X%" indicator showing AutoDJ vs live ratio
- Playlist management within station

#### 2.5 Station Settings
- Station Name
- Logo (Upload: JPG/PNG/WebP, 500x500 to 3000x3000, max 1MB)
- Genre (dropdown)
- Country (dropdown)
- Website URL
- Stream description
- **Announcements:** Title + Content (broadcast alerts to listeners)

#### 2.6 Create Station
Fields:
- Station Name
- Logo (image upload with size/format requirements)
- Genre (dropdown: General, Music, News, Talk, Sports, Religious, etc.)
- Country (dropdown)
- Website URL
- Note: "Upgrade to add new stations" (free plan limited to 2 stations)

### 3. Analytics
| Sub-tab | Features |
|---------|----------|
| **Live** | Real-time listener count, countries breakdown, all-station or per-station filter |
| **Streaming** | Historical listener data, session duration, peak times |
| **Podcasts** | Podcast episode play counts |
| **Call-in** | CTL usage statistics |

Analytics shows:
- Listener count over time (chart)
- Geographic distribution (countries)
- Peak listening hours
- Session duration averages
- Week-over-week comparison

### 4. Podcasts
- **Create podcast** — separate from station
- **Episode management** — upload audio episodes
- **Distribution** — RSS feed for Apple Podcasts, Spotify, etc.
- **Analytics** — per-episode play counts
- Unlimited storage (on paid plans)

### 5. People (Team Management)
- Invite users by email
- Role: Admin
- Manage team access to account

### 6. Account Settings
- Company Name
- Email
- Country
- Address / City / Area / Postal Code / Telephone
- Save button

### 7. Plans & Billing
| Plan | Features |
|------|----------|
| **Free** | 2 stations, basic analytics, ads on stream |
| **Starter** | More stations, ad-free option, 6-month analytics |
| **Professional** | Unlimited stations, priority support, custom branding |
| **Business** | Enterprise features, SLA, dedicated support |

- Promo code support
- Legacy plans section
- Billing history

### 8. Monetization
- **Audio ads** inserted during stream
- Revenue sharing with station owners
- Ad credit system
- Performance metrics

### 9. Widget/Embed
- Embeddable HTML player code
- Customizable widget appearance
- Copy-paste embed code for websites

### 10. CTL (Call-To-Listen)
- Phone number assigned to station
- Listeners dial in to hear stream (no internet needed)
- USA-only feature
- Usage analytics

### 11. Zeno.FM Microsite
- Custom station page on zeno.fm domain
- Public directory listing
- SEO-optimized station page

---

## FEATURE COMPARISON: ZENO FM vs OPENRADIO

| Feature | Zeno FM | OpenRadio | Gap |
|---------|---------|-----------|-----|
| **Station Creation** | ✅ Name, Logo, Genre, Country, Website | ✅ Name, Genre, Country, Language, Timezone, Description, Mount | ✅ OpenRadio has MORE fields |
| **Multiple Stations** | ✅ (2 free, more on paid) | ✅ Unlimited | ✅ Better |
| **Broadcast/Encoder Settings** | ✅ Icecast compatible | ✅ Full Icecast source credentials | ✅ Same |
| **Stream URLs (MAIN/M3U/PLS)** | ✅ All three formats | ⚠️ Only main stream URL shown | 🟡 Need M3U/PLS |
| **Auto DJ** | ✅ Upload + auto-play when offline | ✅ Upload + Liquidsoap playlist | ✅ Same |
| **Live → AutoDJ Fallback** | ✅ Automatic switching | ✅ Configured in Liquidsoap | ✅ Same |
| **CDN/Relay Scaling** | ✅ JWT-signed edge servers (stream-XXX.zeno.fm) | ⚠️ Single Icecast + proxy | 🔴 Need relay tree |
| **Analytics - Live** | ✅ Real-time listeners + countries | ⚠️ Basic metric model | 🟡 Need real-time |
| **Analytics - History** | ✅ 6 months, charts | ⚠️ Metric snapshots only | 🟡 Need charting |
| **Podcast Hosting** | ✅ Full (create, upload, RSS, distribution) | ❌ Not implemented | 🟡 Future |
| **Widget/Embed** | ✅ Customizable embed code | ✅ /embed/[slug] page | ✅ Same |
| **CTL (Phone Dial-In)** | ✅ USA only | ❌ Skip | ❌ Not needed |
| **Monetization** | ✅ Audio ads + revenue share | ❌ Not implemented | 🟡 Future |
| **Team Management** | ✅ Invite by email, roles | ❌ Single owner only | 🟡 Need roles |
| **Plans/Billing** | ✅ Free/Starter/Pro/Business | ❌ All free (self-hosted) | ✅ Different model |
| **Station Logo** | ✅ Upload with size validation | ⚠️ logoUrl field only (no upload UI) | 🟡 Need upload |
| **Announcements** | ✅ Title + Content broadcast | ❌ Not implemented | 🟡 Feature |
| **Geo-blocking** | ❌ Not visible in UI | ✅ Full geo-block system | ✅ Better |
| **Relay Streams** | ❌ Not visible in free plan | ✅ Relay model + UI | ✅ Better |
| **Schedule Blocks** | ❌ Not visible in free plan | ✅ Time-based scheduling | ✅ Better |
| **Royalty Reporting** | ❌ Not visible | ✅ PlayLog model | ✅ Better |
| **Station Directory** | ✅ zeno.fm/explore | ✅ /explore with search + filters | ✅ Same |
| **Public Station Page** | ✅ On zeno.fm domain | ✅ /stations/[slug] with player | ✅ Same |
| **Mobile Apps** | ✅ iOS + Android | ❌ Web only | 🟡 Future |
| **Recording** | ✅ Record live shows | ❌ Not implemented | 🟡 Future |
| **Password Reset** | ✅ Keycloak-based | ✅ Token-based email reset | ✅ Same |
| **Docker/Self-Hosted** | ❌ SaaS only | ✅ Full Docker Compose | ✅ Better |
| **Open Source** | ❌ Proprietary | ✅ MIT Licensed | ✅ Better |

---

## PRIORITY FIXES FOR OPENRADIO PARITY

### Must-Have (for production 24/7):
1. ✅ **AutoDJ plays tracks automatically** — DONE (Liquidsoap + m3u)
2. ✅ **Live → AutoDJ fallback** — DONE (harbor input in Liquidsoap)
3. 🔴 **M3U/PLS stream URL formats** — Easy to add
4. 🔴 **Logo upload UI** — Need file upload for station logo
5. 🔴 **Real-time analytics** — WebSocket or polling for live listener count

### Should-Have (scale to millions):
6. 🔴 **CDN/Relay tree** — JWT-signed relay endpoints like Zeno
7. 🟡 **Historical analytics with charts** — ApexCharts or similar
8. 🟡 **Team management** — Invite users, role-based access
9. 🟡 **Announcements** — Broadcast messages to listeners

### Nice-to-Have (competitive features):
10. 🟡 **Podcast hosting** — Separate podcast CRUD + RSS feed
11. 🟡 **Recording** — Save live broadcasts as files
12. 🟡 **Monetization** — Ad insertion framework
13. 🟡 **Mobile apps** — React Native or PWA

---

## ARCHITECTURE DIFFERENCES

### Zeno FM Architecture:
```
Users → CDN (stream-XXX.zeno.fm) → JWT Auth → Edge Servers → Source
                                                                ↑
                                                    Liquidsoap/AutoDJ
```
- **JWT stream tokens** expire in ~60s (anti-hotlinking)
- **Multiple edge servers** (stream-178, etc.) for geographic distribution
- **Keycloak** for auth (OpenID Connect)
- **Google Cloud** infrastructure (appspot IDs in keys)

### OpenRadio Architecture:
```
Users → App HTTPS proxy → Icecast → Liquidsoap/AutoDJ
                            ↑
                    Live encoder (harbor)
```
- **Direct Icecast** through app proxy
- **Cookie session auth** (bcrypt + SHA-256 tokens)
- **Docker Compose** on any VPS
- **Self-hosted** — full control

### Scaling Path for OpenRadio:
1. Add Icecast relay instances behind a load balancer
2. Optional: CDN layer (Cloudflare/Bunny Stream)
3. Optional: JWT-signed stream URLs for anti-hotlink
4. S3/MinIO for track storage across instances
5. Redis pub/sub for real-time listener counts
