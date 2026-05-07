# Zeno vs OpenRadio Functional Parity Audit

Date: May 7, 2026 (UTC)
Scope: Public-page and codebase audit for functional/business-method parity only (not visual cloning).

## 1) Scope and legal/copyright guardrails

This audit targets workflow parity with publicly visible Zeno journeys while preserving original implementation in OpenRadio.

Guardrails used in this audit:
- Compare capabilities and user outcomes, not visual design identity.
- Use only public Zeno pages and publicly indexed snippets; no private dashboards, no credential-gated scraping.
- Do not copy trademarks, logos, product copy, CSS, component layouts, protected media, or proprietary code.
- Implement equivalent features with new naming, original UX writing, original UI composition, and original data contracts.

## 2) OpenRadio inventory (current state)

### 2.1 Next.js routes

| Route | Type | Auth | Source |
|---|---|---|---|
| `/` | Landing/marketing | Public | `src/app/page.tsx` |
| `/sign-in` | Sign in | Public | `src/app/(auth)/sign-in/page.tsx` |
| `/sign-up` | Account creation | Public | `src/app/(auth)/sign-up/page.tsx` |
| `/dashboard` | Station list/dashboard | Required | `src/app/(dashboard)/dashboard/page.tsx` |
| `/dashboard/stations/new` | Station creation wizard | Required | `src/app/(dashboard)/dashboard/stations/new/page.tsx` |
| `/dashboard/stations/[stationId]` | Station studio (credentials, tracks, playlists, metadata) | Required | `src/app/(dashboard)/dashboard/stations/[stationId]/page.tsx` |
| `/stations/[slug]` | Public station/player page | Public | `src/app/stations/[slug]/page.tsx` |
| `not-found` | 404 page | Public | `src/app/not-found.tsx` |

### 2.2 API endpoints

| Endpoint | Methods | Auth | Primary behavior |
|---|---|---|---|
| `/api/health` | `GET` | No | Health JSON (`status`, `service`) |
| `/api/stations` | `GET`, `POST` | Yes | List user stations, create station + default playlist |
| `/api/stations/[stationId]` | `GET`, `PATCH`, `DELETE` | Yes | Station detail/update/delete |
| `/api/stations/[stationId]/tracks` | `GET`, `POST` | Yes | List/create track metadata |
| `/api/stations/[stationId]/playlists` | `GET`, `POST` | Yes | List/create playlists |
| `/api/playlists/[playlistId]/tracks` | `POST` | Yes | Add track to playlist |
| `/api/playlists/[playlistId]/tracks/[playlistTrackId]/move` | `POST` | Yes | Reorder playlist tracks up/down |

Notes:
- Cookie session auth is shared between web and API (`requireApiUser`, `requireUser`).
- Ownership checks exist for station-scoped operations.

### 2.3 Prisma data model

Current Prisma models and relationships:
- `User` -> owns `Station`, creates `Playlist` and `Track`, has `Session` records.
- `Session` -> cookie-session persistence with expiry/activity metadata.
- `Station` -> core station profile, stream credentials, mount path, status.
- `Track` -> station library metadata (`title/artist/album/duration/fileUrl`).
- `Playlist` -> station playlists with `isDefault` flag.
- `PlaylistTrack` -> ordered many-to-many between playlists and tracks.
- `ListenerMetric` -> sampled aggregate stats per station.
- Enum `StationStatus`: `DRAFT`, `ACTIVE`, `PAUSED`.

### 2.4 Docs and deployment assets

| File | Coverage |
|---|---|
| `README.md` | MVP scope, quick start, architecture, API list, Coolify deployment steps |
| `CONTRIBUTING.md` | Dev setup, quality checks, legal boundary note |
| `.env.example` | App/database/streaming/Icecast/Liquidsoap envs |
| `docker-compose.yml` | App + Postgres + Redis + Icecast + Liquidsoap stack |
| `Dockerfile` | Multi-stage Next.js build, runtime boot with Prisma push |
| `docker/icecast/*` | Icecast container and templated config |
| `docker/liquidsoap/start.sh` | Baseline AutoDJ Liquidsoap script |

Coolify-specific note:
- No dedicated `coolify.yml`/manifest exists; README documents compose-based deployment path.

## 3) Public Zeno workflows observed

Observed from public pages and public index snippets (`zeno.fm`, `zeno.fm/explore`, `zeno.fm/radio/...`, creator-marketing paths like `/streaming`, `/automation`, `/pricing`, and signup flows under `tools.zeno.fm`).

### 3.1 Visible creator workflows

- Discover creator offer from public marketing pages.
- Move from marketing pages into account registration/sign-in.
- Create/manage stations from creator tools dashboard.
- Configure live broadcasting with encoder-compatible setup.
- Use automation concepts (playlist programming, scheduling/smart block style logic, stream/relay handling references in public help/indexed docs).
- Review analytics/engagement signals from creator tools messaging.
- Evaluate plan/pricing options from pricing journey.

### 3.2 Visible listener workflows

- Explore directory content (stations/podcasts, trending, genre/location/language filtering cues).
- Open station pages and listen in-browser.
- View similar/sponsored station suggestions.
- Download/open mobile app entry points.

## 4) Page-by-page comparison

| Zeno public page/workflow | Visible capability | OpenRadio equivalent | Parity level | Gap summary |
|---|---|---|---|---|
| `https://zeno.fm/` | Split creator + listener entry, discovery-first navigation | `/` (`src/app/page.tsx`) | Partial | OpenRadio has creator landing and CTA, but no listener discovery hub from homepage. |
| `https://zeno.fm/streaming/` | Creator-oriented streaming proposition/onboarding path | No dedicated page (creator CTA on `/`) | Partial | Core concept exists, but no dedicated streaming feature funnel page and limited onboarding depth. |
| `https://zeno.fm/automation/` | Automation-specific positioning (scheduled/automated programming expectations) | Station studio playlist ordering only (`/dashboard/stations/[stationId]`) | Low | Missing scheduling engine, smart rule blocks, and automation runtime controls. |
| `https://zeno.fm/pricing/` | Public plan comparison and commercial packaging | Pricing-style section on `/` only | Low | No plan objects, billing flows, or gated entitlements. |
| `https://zeno.fm/signup/` + `tools.zeno.fm/signup` | Creator registration funnel to dashboard | `/sign-up` + `/sign-in` | Medium | Basic registration exists, but no multi-step onboarding and no post-signup guided activation. |
| `https://zeno.fm/explore/` | Search/discovery across stations and podcasts | None | None | No explore page, no catalog ranking, no filter/search taxonomy. |
| `https://zeno.fm/radio/<station>` | Listener page: web playback + recommendations + app prompts | `/stations/[slug]` | Partial | Playback exists; missing recommendation graph, sponsored placements, app funnels, richer metadata/episodes. |

## 5) Flow-by-flow comparison

| Workflow | Zeno-visible outcome | OpenRadio current behavior | Parity |
|---|---|---|---|
| Creator acquisition funnel | Dedicated creator pages for streaming/automation/pricing -> signup | Single landing with sign-up CTA | Partial |
| Account creation and login | Creator account onboarding into station tools | Works (`/sign-up`, `/sign-in`) | Medium |
| Create first station | Guided station creation and tool entry | Works (`/dashboard/stations/new`) | Medium |
| Connect encoder and go live | Encoder credential setup guidance | Works (host/port/mount/user/pass surfaced) | Medium |
| Automation programming | Advanced scheduling/automation expectations | Manual tracks/playlists + reorder only | Low |
| Track ingestion | Library management expected at scale | Metadata + external URL only, no upload/transcode pipeline | Low |
| Listener discovery | Explore/search/filter/trending stations/podcasts | Not implemented | None |
| Public listening page | Stream playback + related content + app paths | Playback + basic stats + recent tracks | Partial |
| Analytics feedback loop | Operational/growth analytics emphasized | Placeholder sampled metrics only | Low |
| Commercial lifecycle | Pricing/plan differentiation and monetization expectations | No billing/subscription system | None |

## 6) API/backend/data-model parity comparison

### 6.1 API parity

| Area | OpenRadio status | Parity risk |
|---|---|---|
| Station CRUD | Implemented | Good baseline |
| Track create/list | Implemented (no update/delete) | Medium |
| Playlist create/list/add/reorder | Implemented | Medium |
| Auth/session | Implemented via cookie sessions | Good baseline |
| Automation control APIs | Not implemented | High |
| Scheduling/block APIs | Not implemented | High |
| Discovery/search APIs | Not implemented | High |
| Analytics ingest/report APIs | Not implemented beyond DB placeholder | High |
| Billing/entitlement APIs | Not implemented | High |

### 6.2 Backend/runtime parity

| Capability | OpenRadio status |
|---|---|
| Streaming infra baseline | Icecast + Liquidsoap containers available |
| Per-station automation workers | Not implemented |
| Queue/event backbone for playout | Redis present but unused for orchestration |
| File ingestion/transcoding | Not implemented |
| Stream health supervision/failover | Not implemented |
| Recommendation/discovery ranking | Not implemented |

### 6.3 Data model parity

| Domain entity family | OpenRadio models | Missing for stronger parity |
|---|---|---|
| Identity and sessions | `User`, `Session` | Roles/team membership, permissions, audit logs |
| Station and streaming | `Station`, `StationStatus` | Source profiles, relay configs, stream targets, branding packs |
| Library and programming | `Track`, `Playlist`, `PlaylistTrack` | Schedules, rules/blocks, clock wheels, show programming, asset states |
| Analytics | `ListenerMetric` | Time-series granularity, geo/device/referrer dimensions, event-level ingestion |
| Commercial | None | Plans, subscriptions, invoices, feature entitlements |
| Listener/discovery | Public page by slug only | Station directory entities, taxonomy, ranking signals, podcast/episode entities |

## 7) Severity-ranked gap list

### Critical
1. Automation engine parity gap: no schedule/block-based playout logic, only manual playlist ordering.
2. Discovery/listener ecosystem gap: no explore/search/taxonomy/trending surface for stations/podcasts.
3. Audio ingestion pipeline gap: no first-party upload, validation, storage, or transcoding workflow.

### High
1. Analytics gap: no real ingestion pipeline or actionable creator dashboards.
2. Commercial gap: no pricing/plan entitlement backend (only marketing copy section).
3. Orchestration gap: Redis not yet used for job queues/workers despite architecture direction.
4. Team/roles gap: single-owner model only.

### Medium
1. API completeness gap: missing update/delete endpoints for tracks/playlists and richer filtering.
2. Station lifecycle controls gap: limited runtime controls from UI for activation/automation modes.
3. Onboarding depth gap: account creation exists but no guided “first broadcast” checklist.

### Low
1. Public station enrichment gap: recommendations, social proofs, and richer metadata are minimal.
2. Deployment ergonomics gap: no dedicated Coolify manifest/ops presets.

## 8) Recommended roadmap to reach parity safely (without copying)

### Phase 0: Legal + product foundations (1-2 weeks)
- Freeze explicit anti-copy guardrails in engineering checklist.
- Define original information architecture and naming for creator/listener surfaces.
- Write product requirements in outcome terms (not UI mimicry terms).

### Phase 1: Creator core parity v1 (2-4 weeks)
- Add creator-focused pages for streaming, automation, and pricing with original content.
- Introduce first-run onboarding checklist after sign-up.
- Expand station setup to include stream status and validation diagnostics.

### Phase 2: Automation parity v1 (4-8 weeks)
- Model scheduling entities (`ScheduleBlock`, `RuleSet`, `ProgramSlot`, etc.).
- Implement queue workers using Redis for per-station playout orchestration.
- Expose automation APIs + dashboard controls for schedule and rule management.

### Phase 3: Library ingestion and media pipeline (3-6 weeks)
- Add direct upload + object storage integration.
- Add metadata extraction, transcoding jobs, and asset lifecycle states.
- Add track validation and retry/error workflows.

### Phase 4: Listener/discovery parity v1 (3-6 weeks)
- Build explore/search pages with genre/location/language taxonomy.
- Add ranking signals (recent activity/listener trends/editorial flags).
- Enrich station pages with related stations and stronger metadata.

### Phase 5: Analytics + monetization foundations (4-8 weeks)
- Ingest stream/listener events and expose creator analytics dashboards.
- Introduce plan/entitlement tables and billing integration abstraction.
- Add entitlement checks to APIs/features.

### Phase 6: Scale and governance (ongoing)
- Add role-based collaboration and audit logs.
- Add reliability controls (health checks, worker supervision, failover strategy).
- Add contract tests for API and load tests for streaming workflows.

## 9) Explicit “do not copy” list

Do not copy from Zeno (or any third-party product):
- Brand identifiers: names, logos, icons, taglines, and trademarked marks.
- Exact marketing copy, headers, CTA phrasing, pricing-card wording, and FAQ text.
- CSS tokens, layout composition, spacing systems, animation signatures, and component structure.
- Proprietary images, illustrations, screenshots, audio assets, station catalogs, and curated lists.
- Private API contracts, hidden endpoint behavior, or implementation logic from non-public systems.
- Terms/privacy/legal text templates.

Safe parity approach:
- Keep feature intent and user outcomes; rebuild implementation, naming, and design from first principles.
- Author all new UI text and docs internally.
- Use independently sourced assets/licensed iconography only.

## 10) Verification notes

- Code changes: none (production/runtime code untouched).
- Deliverable added: `docs/audits/zeno-openradio-page-by-page-audit.md`.
- Lint/typecheck executed separately after doc creation.
