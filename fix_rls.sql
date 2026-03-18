-- EMERGENCY FIX: Make RLS policies completely permissive for testing
-- Run this in Supabase SQL Editor to fix the 404 error

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update_host" ON public.sessions;
DROP POLICY IF EXISTS "playback_select" ON public.session_playback;
DROP POLICY IF EXISTS "playback_update" ON public.session_playback;
DROP POLICY IF EXISTS "messages_select" ON public.session_messages;
DROP POLICY IF EXISTS "messages_insert" ON public.session_messages;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_upsert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create permissive policies for testing
CREATE POLICY "allow_all_select" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.sessions FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.sessions FOR DELETE USING (true);

CREATE POLICY "allow_all_select" ON public.session_playback FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.session_playback FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.session_playback FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.session_playback FOR DELETE USING (true);

CREATE POLICY "allow_all_select" ON public.session_messages FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.session_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.session_messages FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON public.session_messages FOR DELETE USING (true);

CREATE POLICY "allow_all_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON public.profiles FOR UPDATE USING (true);

-- Ensure realtime is enabled
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_playback;
alter publication supabase_realtime add table public.session_messages;
