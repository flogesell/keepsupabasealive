# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-05-21

### Added

- **Edit project** dialog on each project card (name, URL, ping interval; anon key optional — leave blank to keep the current key).
- Shared `INTERVAL_OPTIONS` helper for add/edit forms (`src/lib/project-intervals.ts`).
- **Initial health check** when a project is created (in addition to the scheduled interval).
- Minimal `docker/sqlite-native-package.json` so the production image compiles only SQLite native deps (avoids installing the full app via npm during Docker build).
- Coolify guidance for **scheduled tasks** calling `POST /api/cron` as a reliable backup to the in-process scheduler.

### Changed

- **Scheduler** starts more reliably in production: `globalThis` guard, `ensureSchedulerStarted()` from instrumentation and first DB init, due pings ~3s after startup (not only on the next minute boundary).
- **Dockerfile**: `native-deps` stage uses the minimal SQLite package manifest instead of the app `package.json` (fixes slow/failed Coolify builds).
- Dashboard API calls use `apiFetch` with `credentials: "include"` so HTTP Basic Auth is sent on `fetch()` requests.
- README: clearer production runtime (Bun = build, Node 24 LTS = run), `DATABASE_PATH` must be `/data/keepsupabasealive.db` on Coolify, and troubleshooting for SQLite / scheduler / Bun runtime errors.

### Fixed

- **Coolify Docker build** failing or timing out on `npm install` in `native-deps` (npm was installing Next.js, shadcn, and the rest of the dependency tree).
- **Production SQLite** errors when `DATABASE_PATH` was set to `./data/...` instead of an absolute path under `/data` (entrypoint and env validation now enforce `/data/...` in Docker).
- **API 500** responses now include actionable `hint` fields for common SQLite, migration, and Bun-vs-Node native module failures.
- **Rate-limited** page reachable without a second Basic Auth prompt (redirect to `/rate-limited` instead of rewrite; path excluded from proxy auth).

## [0.1.0] - 2026-05-20

### Added

- Dashboard to manage Supabase projects: add, delete, view ping history and latency charts.
- Scheduled health checks to `/auth/v1/health` per project (in-process cron, configurable interval).
- `POST /api/cron` endpoint as a reliable external trigger (Coolify scheduled tasks, cURL, etc.).
- HTTP Basic Auth enforced via proxy middleware; credentials configurable via environment variables.
- Anon keys encrypted at rest in SQLite using a server-side secret.
- Rate limiting with a dedicated `/rate-limited` error page and improved login-failure handling.
- Docker image with Bun-based build and Node 24 LTS runtime; Coolify-ready out of the box.
- Docker entrypoint script that manages file-system permissions before starting the app.
- `.env.example` documenting all required and optional environment variables.

[0.1.1]: https://github.com/flogesell/keepsupabasealive/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/flogesell/keepsupabasealive/releases/tag/v0.1.0
