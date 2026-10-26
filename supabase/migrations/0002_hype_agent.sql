-- Sports meme video agent: durable job records, budget ledger and the
-- rights-cleared reference clip library.

create table public.hype_jobs (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid references public.picks(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','waiting_provider','budget_blocked','failed','completed','canceled')),
  step text not null default 'resolve_subject',
  mode text not null default 'live' check (mode in ('live','simulated')),
  cap_usd numeric(8,2) not null default 2.00,
  reserved_usd numeric(8,2) not null default 0,
  spent_usd numeric(8,2) not null default 0,
  error text,
  lock_until timestamptz,
  data jsonb not null default '{}'::jsonb,   -- full job document (subject, format, brief, provider refs, ledger, events)
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.hype_jobs (status, updated_at);
create index on public.hype_jobs (pick_id);

create table public.meme_references (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_url text not null,
  duration_sec int not null check (duration_sec between 1 and 15),
  aspect text not null default '9:16',
  tags text[] not null default '{}',
  sports text[] not null default '{}',
  mood text not null default '',
  license_note text not null default '',   -- who granted the right to reuse this clip, and how
  source text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public) values ('hype', 'hype', true) on conflict do nothing;

alter table public.hype_jobs enable row level security;
alter table public.meme_references enable row level security;
create policy "admin hype jobs" on public.hype_jobs for all using (public.is_admin()) with check (public.is_admin());
create policy "admin meme refs" on public.meme_references for all using (public.is_admin()) with check (public.is_admin());

-- Optional: run the worker every minute with pg_cron + pg_net (Vercel Hobby crons are daily).
--   select cron.schedule('hype-worker', '* * * * *', $$
--     select net.http_post(url := 'https://YOUR_SITE/api/cron/hype', headers := '{"authorization":"Bearer YOUR_CRON_SECRET"}'::jsonb)
--   $$);
