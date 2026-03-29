# Alogo Hire Assignment

Full-stack incident monitoring system with:

- Backend: Node.js + TypeScript + PostgreSQL
- Frontend: React + Tailwind CSS
- Realtime updates: Server-Sent Events (SSE), no polling

ORM/query layer:

- Mongoose schemas for API data models in `backend/src/models/`
- Controller-based API handlers in `backend/src/controllers/`
- Routes now map to controllers in `backend/src/api/routes.ts`

## What is implemented

### Backend requirements

- Ingest endpoint with async processing pipeline: `POST /ingest`
  - Accepts max 500 readings per request
  - Persists readings immediately and enqueues for worker processing
  - Returns quickly with `202 Accepted`
- Anomaly detection workers (3 rule types)
  - `threshold_breach`: metric value > 100
  - `rapid_change`: absolute delta from previous reading > 30
  - `pattern_absence`: no reading for > 2 minutes
- Alert lifecycle API
  - `POST /alerts`
  - `PATCH /alerts/:id/transition`
  - `POST /alerts/:id/acknowledge`
  - `POST /alerts/:id/resolve`
- Auto-escalation mechanism
  - Sweep every 15s
  - Escalates open alerts older than 5 minutes
- Suppression API
  - `POST /suppressions` with `startTime` and `endTime`
- Historical query endpoint
  - `GET /sensors/:id/history`
  - Returns readings, anomaly-trigger flag, and anomaly->alert mapping
  - Paginated with default page size 100
- Zone-scoped data access on all endpoints
  - Required context via `x-zone-id` + `x-operator-id` headers

### Suppression behavior

- During active suppression, anomalies are still detected and saved.
- Suppressed anomalies do not produce notifications.
- Suppressed anomalies are stored with `suppressed=true`.
- If suppression starts while an alert is already open:
  - Existing alert remains open.
  - New anomalies during suppression are recorded but do not notify or escalate.
  - Existing alert can still be acknowledged/resolved manually.

### Database requirements

- PostgreSQL schema with indexes for history and alert queries
- Realtime event emission via in-process event bus + SSE endpoint `GET /events`

### Frontend requirements

- Live sensor dashboard, scoped to operator zone
- Alert management panel with acknowledge/resolve controls
- Sensor detail view with recent readings, anomalies, and suppression status
- Realtime updates without polling (SSE)

## API summary

- `GET /health`
- `POST /ingest`
- `GET /sensors`
- `GET /sensors/:id/history?page=1&pageSize=100`
- `GET /alerts?page=1&pageSize=100&status=open`
- `POST /alerts`
- `PATCH /alerts/:id/transition`
- `POST /alerts/:id/acknowledge`
- `POST /alerts/:id/resolve`
- `POST /suppressions`
- `GET /events`

## Project structure

- `backend/` API, workers, SQL schema
- `frontend/` React UI

## Setup

### 1) Database

Run the schema in `backend/sql/001_init.sql`.

### 2) Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
npm run worker
```

Set `MONGODB_URI` in `.env` for Mongoose-backed API queries.

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional env in frontend:

- `VITE_API_BASE_URL` (default `http://localhost:4000`)
- `VITE_ZONE_ID` (default `zone-a`)
- `VITE_OPERATOR_ID` (default `operator-1`)

## Performance benchmark approach

### `POST /ingest` batch 500 <= 200ms

- Writes are done in a single transaction.
- Endpoint only persists and enqueues; anomaly logic runs in workers.
- Minimal synchronous response payload.

### `GET /sensors/:id/history` 30 days <= 300ms

- Composite index on `(sensor_id, reading_at DESC)`.
- Bounded pagination (default 100, max 500).
- Single query that joins anomalies and aggregates per reading.

### `GET /alerts` paginated filtered <= 150ms

- Index on `(zone_id, status, opened_at DESC)`.
- Filter-first query with pagination.

### Sensor state change -> dashboard update <= 3s

- Worker loop runs every 1s.
- SSE pushes sensor/alert/anomaly events immediately on write.

### Escalation timer within 30s of 5-minute mark

- Escalation sweep runs every 15s.

### Pattern absence within 60s of 2-minute silence

- Pattern-absence sweep runs every 30s.
- Duplicate guard prevents repeated alerts within the same minute.

## Notes

If you do not have `node`/`npm` in PATH, install Node.js LTS and reopen terminal before running scripts.
