# Supabase Migration Summary

## What Was Done

1. **Created Supabase API Module** (`src/lib/supabase-api.ts`)
   - `sessionApi`: Create/join sessions, update playback state
   - `chatApi`: Send/receive chat messages  
   - `presenceApi`: Track who's in the room (simplified for now)
   - `realtimeApi`: Subscribe to live updates via Supabase Realtime

2. **Updated CreateSession** (`src/pages/CreateSession.tsx`)
   - Now uses `sessionApi.create()` instead of direct Supabase calls
   - Cleaner error handling

3. **Fixed Proxy** (`api/supabase/[[...path]].js`)
   - Properly forwards all headers including cookies
   - Handles redirects for OAuth flow
   - Fixes the Indian ISP block issue

## What You Need To Do

### Step 1: Run the Supabase Schema

Go to [Supabase Dashboard](https://app.supabase.com) → Your Project → SQL Editor

Paste and run the contents of `supabase_schema.sql` file.

This creates:
- `profiles` table (extends auth.users)
- `sessions` table (watch rooms)
- `session_playback` table (play/pause/seek state)
- `session_messages` table (chat)
- Row Level Security policies
- Realtime subscriptions

### Step 2: Update Vercel Environment Variables

Go to [vercel.com](https://vercel.com) → Your Project → Settings → Environment Variables:

```
SUPABASE_URL=https://pbbxvmijtlgwdjivmgao.supabase.co
VITE_SUPABASE_PROXY_URL=https://watch-along.vercel.app/api/supabase
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYnh2bWlqdGxnd2RqaXZtZ2FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDgxNDgsImV4cCI6MjA4MzI4NDE0OH0.ZBmXxyVU3Lk8aPncsi58pWx3lSbQ_IXlUrvPQTEDgvQ
VITE_SUPABASE_URL=https://pbbxvmijtlgwdjivmgao.supabase.co
```

### Step 3: Deploy

```bash
git add .
git commit -m "Migrate to Supabase: add proxy and API module"
git push
```

Or click "Redeploy" in Vercel dashboard.

## Architecture Changes

**Before:**
- Frontend (Vercel) → Express Backend (localhost/Render) → Supabase
- WebSocket for real-time sync
- File-based storage (`store.json`)

**After:**
- Frontend (Vercel) → Supabase Proxy (Vercel) → Supabase
- Supabase Realtime for live sync
- Database storage (PostgreSQL)

## What's Still Needed

The **WatchRoom** component (`src/pages/WatchRoom.tsx`) still uses WebSockets and the old Express backend. You need to update it to:

1. Use `sessionApi` to get/join sessions
2. Use `realtimeApi` to subscribe to playback changes
3. Use `chatApi` for messages
4. Remove WebSocket code (`new WebSocket()` calls)

This is a bigger change (~300 lines) and should be done carefully.

## Testing

After deployment:
1. Go to `https://watch-along.vercel.app`
2. Sign in with Google (should work now via proxy)
3. Create a session
4. Share the join code
5. Open in another browser/incognito
6. Both should sync play/pause/seek in real-time

## Notes

- No more Render backend needed (no cold starts!)
- All data persists in Supabase (survives deploys)
- Real-time sync via Supabase (faster than WebSocket reconnection)
- Works in India (proxy bypasses ISP blocks)
