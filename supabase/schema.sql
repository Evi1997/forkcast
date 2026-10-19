-- Forkcast database: one JSON document per user per key
-- (profile, chat, plan, progress, log-YYYY-MM-DD).
-- Run once in Supabase → SQL Editor → New query → Run.

create table if not exists public.user_docs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Row-level security: each person can only see and change their own rows.
alter table public.user_docs enable row level security;

drop policy if exists "own docs: read"   on public.user_docs;
drop policy if exists "own docs: insert" on public.user_docs;
drop policy if exists "own docs: update" on public.user_docs;
drop policy if exists "own docs: delete" on public.user_docs;

create policy "own docs: read"   on public.user_docs for select using (auth.uid() = user_id);
create policy "own docs: insert" on public.user_docs for insert with check (auth.uid() = user_id);
create policy "own docs: update" on public.user_docs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own docs: delete" on public.user_docs for delete using (auth.uid() = user_id);
