# Backend

## Run

1. Install deps: `npm install`
2. Create DB and run schema in `sql/001_init.sql`
3. Copy `.env.example` to `.env`
4. Generate Prisma client: `npm run prisma:generate`
5. Run API: `npm run dev`
6. Run workers: `npm run worker`

## ORM note

This project now includes Mongoose schema/models and controller-based route handling.

- Mongo connection: `src/core/mongo.ts`
- Schemas/models: `src/models/`
- Controllers: `src/controllers/`
- Router mapping: `src/api/routes.ts`

Environment variable required for Mongoose:

- `MONGODB_URI`

## Zone scope

All endpoints require headers:

- `x-zone-id`
- `x-operator-id`

Queries are filtered by `zone_id`.

## Suppression handling decision

If a suppression is created while an alert is already open for the same sensor:

- The existing alert remains open and visible.
- New anomalies created during the suppression window are saved with `suppressed=true`.
- Suppressed anomalies do not create notification rows and do not drive escalation.
- Operators can still acknowledge/resolve the pre-existing alert through lifecycle APIs.

This choice preserves audit continuity for in-flight incidents while respecting suppression intent for new events.
