# Temporary assignment location bypass

`ASSIGNMENT_LOCATION_TRACKING_ENABLED` in `lib/location/config.ts` is currently `false` while the Google geocoding account is unavailable.

The promotor start flow does not request browser geolocation or send coordinates. The assignment API skips the location requirement, geocoding, radius check, and location writes, including coordinates submitted by an older client. Start times, early-start reasons, assignment ownership checks, and mandatory completion photos keep their existing behavior. Existing location records remain intact; new starts remain unverified with no location stamp.

Middleware allows authenticated promotors to reach `PATCH /api/assignments/today`; its handler still verifies assignment ownership. Editing an assignment through `PATCH /api/assignments/:id` remains restricted to admins.

To restore tracking, configure the existing Google geocoding credentials, set this single flag to `true`, and redeploy. The browser GPS request and server-side 300 metre start check are preserved. No database migration or backfill is needed.
