-- Extensions
create extension if not exists "pgcrypto";

-- Tables
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  role text not null,
  provider text not null check (provider in ('anthropic', 'google')),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_type text not null check (sender_type in ('agent', 'user')),
  sender_id uuid references public.agents(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_project_id_created_at_idx on public.messages (project_id, created_at);
create index agents_project_id_idx on public.agents (project_id);

-- RLS
alter table public.projects enable row level security;
alter table public.agents enable row level security;
alter table public.messages enable row level security;

create policy "Authenticated users can read projects"
  on public.projects for select
  to authenticated
  using (true);

create policy "Authenticated users can insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update projects"
  on public.projects for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete projects"
  on public.projects for delete
  to authenticated
  using (true);

create policy "Authenticated users can read agents"
  on public.agents for select
  to authenticated
  using (true);

create policy "Authenticated users can insert agents"
  on public.agents for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update agents"
  on public.agents for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete agents"
  on public.agents for delete
  to authenticated
  using (true);

create policy "Authenticated users can read messages"
  on public.messages for select
  to authenticated
  using (true);

create policy "Authenticated users can insert messages"
  on public.messages for insert
  to authenticated
  with check (true);

-- Realtime
alter publication supabase_realtime add table public.messages;
