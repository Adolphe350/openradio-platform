# OpenRadio Cloud

OpenRadio Cloud is an original open-source, self-hosted internet radio platform inspired by common radio-hosting capabilities.

It is **not affiliated with or copied from Zeno.fm**. This project intentionally uses original branding, UI, copy, and implementation.

## MVP Scope

- Landing page with product positioning, feature highlights, how-it-works, OSS/self-hosted pitch, and pricing-style comparison tiers.
- Credentials auth: sign up, sign in, sign out.
- Dashboard:
  - Station list and create station workflow.
  - Station detail with live source credentials (Icecast-compatible encoder settings).
  - AutoDJ data model + UI for tracks and playlists.
  - Playlist track ordering controls.
  - Analytics placeholder cards (current listeners, peak listeners, listening hours, uptime, storage).
- Public station page with built-in HTML audio player.
- API routes for station/track/playlist CRUD primitives.
- Docker Compose stack for Coolify-friendly deployment with:
  - Next.js app
  - PostgreSQL
  - Redis
  - Icecast
  - Liquidsoap AutoDJ

## Tech Stack

- Next.js (App Router) + TypeScript
- Prisma ORM + PostgreSQL
- Cookie session auth + bcrypt password hashing
- Redis (reserved for queue/events expansion)
- Icecast + Liquidsoap for baseline streaming

## Quick Start (Local)

1. Copy env file.

```bash
cp .env.example .env
```

2. Install dependencies.

```bash
npm install
```

3. Start infrastructure (Postgres/Redis/Icecast/Liquidsoap).

```bash
docker compose up -d postgres redis icecast liquidsoap
```

4. Initialize database and seed demo data.

```bash
npm run prisma:push
npm run prisma:seed
```

5. Run web app.

```bash
npm run dev
```

6. Open:
- App: `http://localhost:3000`
- Icecast status: `http://localhost:8000`
- Demo public station page after seed: `http://localhost:3000/stations/city-sunset-radio`

Demo credentials:
- Email: `demo@openradio.cloud`
- Password: `OpenRadio123!`

## Full Docker Compose (All Services)

```bash
docker compose up -d --build
```

The app container runs `prisma db push` on startup.

## Coolify Deployment

1. Push this repository to your Git provider.
2. In Coolify, create a new application from repository.
3. Select **Docker Compose** and point to `docker-compose.yml`.
4. Add persistent volumes:
- `postgres_data`
- `redis_data`
5. Configure environment variables from `.env.example` (use secure production secrets for passwords).
6. Deploy stack.
7. After first deploy, run seed manually if desired:

```bash
npm run prisma:seed
```

### Recommended Production Notes

- Set strong `POSTGRES_PASSWORD`, `ICECAST_SOURCE_PASSWORD`, `ICECAST_ADMIN_PASSWORD`, and `ICECAST_RELAY_PASSWORD`.
- Put a reverse proxy (Traefik/Caddy/Nginx) with TLS in front of app and stream endpoints.
- Restrict Icecast admin access to trusted IPs.
- Move static/audio storage to object storage and store signed URLs in `Track.fileUrl`.

## Encoder Setup (RadioBOSS / BUTT / Mixxx)

From station detail page, copy:

- Host: `STREAM_SOURCE_HOST` (usually `icecast` internally, public hostname externally)
- Port: `ICECAST_SOURCE_PORT` (default `8000`)
- Mount: station `mountPath` (example `/metro-pulse.mp3`)
- Username: station `sourceUsername` (default `source`)
- Password: station `sourcePassword`
- Public URL: `STREAM_PUBLIC_BASE_URL + mountPath`

For most encoders:

- Server type: Icecast2
- Stream format: MP3 (or OGG/AAC if you extend the output pipeline)
- Reconnect: enabled

## Streaming Architecture (MVP)

- Icecast accepts live source connections and serves listeners.
- Liquidsoap service pushes a baseline AutoDJ mount (`LIQ_STREAM_MOUNT`) to Icecast.
- OpenRadio Cloud app stores station credentials, mount path, metadata, playlists, and tracks.
- Public station pages use generated stream URLs based on `STREAM_PUBLIC_BASE_URL`.

### Per-Station AutoDJ Design (Next Step)

Current Liquidsoap config streams one baseline mount for infrastructure validation.
To support per-station AutoDJ in production:

1. Generate one Liquidsoap process per station (or grouped workers).
2. Feed each process with station playlist/track queue from DB/API.
3. Emit each station to its own mount path and source password.
4. Add supervisor + queue (Redis-backed worker) for lifecycle management.

## API Endpoints (MVP)

Authenticated routes use session cookie:

- `GET /api/stations`
- `POST /api/stations`
- `GET /api/stations/:stationId`
- `PATCH /api/stations/:stationId`
- `DELETE /api/stations/:stationId`
- `GET /api/stations/:stationId/tracks`
- `POST /api/stations/:stationId/tracks`
- `GET /api/stations/:stationId/playlists`
- `POST /api/stations/:stationId/playlists`
- `POST /api/playlists/:playlistId/tracks`
- `POST /api/playlists/:playlistId/tracks/:playlistTrackId/move`

## Quality Gates

Run before merge/deploy:

```bash
npm run lint
npm run typecheck
npm run build
```

## Roadmap

- Role-based station team access.
- Real listener metrics ingestion pipeline.
- Audio file upload + transcoding jobs.
- Multi-region relays and failover.
- HLS packaging output.
- Stream alerts and geo/IP rules.
- Podcast ingestion and show recording workflows.

## License

MIT. See `LICENSE`.
