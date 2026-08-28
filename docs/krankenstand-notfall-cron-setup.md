# Krankenstand/Notfall Daily Application Setup

## Overview
The krankenstand/notfall system requires a daily job to apply special status to new assignments for users who have active krankenstand or notfall status.

## API Endpoint
```
GET /api/special-status/apply-daily
```

The endpoint is fail-closed and requires:

```http
Authorization: Bearer <CRON_SECRET>
```

Set `CRON_SECRET` as a sensitive Production environment variable in Vercel.
Vercel Cron automatically sends this bearer header when the variable exists.

This endpoint:
1. Fetches all users with active special status (krankenstand/notfall)
2. Finds their assignments for today
3. Updates those assignments with the appropriate special_status

## Vercel Cron Job Setup

The repository already contains this entry in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/special-status/apply-daily",
    "schedule": "0 6 * * *"
  }]
}
```

This runs daily at 6 AM UTC (7 AM CET / 8 AM CEST).

Do not expose a manual browser trigger. An authorized operator may invoke it
with the bearer secret when incident handling requires it.

## Alternative: Supabase Edge Function

If you prefer using Supabase Edge Functions:

```typescript
// supabase/functions/apply-special-status-daily/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const response = await fetch('https://your-app.vercel.app/api/special-status/apply-daily', {
    headers: { Authorization: `Bearer ${Deno.env.get('CRON_SECRET')}` },
  })
  const data = await response.json()

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Then schedule it in Supabase Dashboard under "Edge Functions" > "Scheduled Functions".

## Verification

Do not run mutation smoke tests against production. Verify deployment logs and
the next scheduled execution; use non-production data for functional tests.
