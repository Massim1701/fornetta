-- Notifies the agent-google Edge Function on every new message so it can
-- generate a reply via Gemini as the project's "google" provider agent.
-- The bearer token below is the project's public legacy anon key (safe to
-- commit) — it only needs to satisfy the function's verify_jwt check; the
-- function itself uses its auto-injected SUPABASE_SERVICE_ROLE_KEY to read/write.
create extension if not exists pg_net;

create or replace function public.notify_google_agent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://qzsvopcszoenbtloicgj.supabase.co/functions/v1/agent-google',
    body := jsonb_build_object('type', 'INSERT', 'table', 'messages', 'record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6c3ZvcGNzem9lbmJ0bG9pY2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzcyNDIsImV4cCI6MjEwNTgxMzI0Mn0.7NYuv1L0nLVw8yE1-h9WHl5otTwFOQqSd2RsQEoWeBI'
    ),
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;

create trigger on_message_insert_notify_google_agent
after insert on public.messages
for each row execute function public.notify_google_agent();
