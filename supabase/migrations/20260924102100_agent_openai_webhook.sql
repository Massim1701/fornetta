-- Extends the message-insert trigger to also notify agent-openai, so the
-- project's "openai" provider agent replies automatically too.
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
  perform net.http_post(
    url := 'https://qzsvopcszoenbtloicgj.supabase.co/functions/v1/agent-openai',
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
