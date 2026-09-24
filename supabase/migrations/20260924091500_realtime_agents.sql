-- Sidebar's agent list relies on postgres_changes for live updates; the initial
-- schema only enabled Realtime on messages, so newly added agents never appeared
-- without a manual reload.
alter publication supabase_realtime add table public.agents;
