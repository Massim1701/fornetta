alter table public.agents drop constraint agents_provider_check;
alter table public.agents add constraint agents_provider_check check (provider in ('anthropic', 'google', 'openai'));
