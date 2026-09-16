# LIBA House Cup Leaderboard

A shared, live house leaderboard for the LIBA workshop. Scores and the latest
50 changes are stored in Upstash Redis so they persist across refreshes,
deployments, and devices.

## Local development

1. Create or connect an Upstash Redis database.
2. Copy `.env.example` to `.env.local` and add the REST credentials.
3. Run `npm install` and `npm run dev`.

## Vercel deployment

Import this repository into Vercel, then connect an Upstash Redis resource from
the project's Storage tab. The integration supplies the required environment
variables. Redeploy once after connecting the database.

The app recognizes either `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN`, or the legacy `KV_REST_API_URL` and
`KV_REST_API_TOKEN` names.
