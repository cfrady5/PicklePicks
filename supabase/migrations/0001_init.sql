-- Mr. Pickle's Picks — core schema
-- Run with: supabase db push   (or paste into the SQL editor)

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type public.user_role as enum ('member', 'admin');
create type public.pick_status as enum ('draft', 'scheduled', 'published', 'settled', 'voided');
create type public.pick_result as enum ('pending', 'win', 'loss', 'push', 'void');
create type public.confidence_tier as enum ('lean', 'play', 'strong');
create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'expired', 'incomplete');
create type public.plan_interval as enum ('day', 'week', 'month');
create type public.notification_type as enum ('new_pick', 'upcoming_game', 'settled', 'renewal', 'system');
create type public.audit_action as enum ('created', 'updated', 'scheduled', 'published', 'settled', 'resettled', 'voided', 'corrected');

-- ---------- reference data ----------
create table public.sports (
  key text primary key,
  label text not null,
  league text not null,
  emoji text,
  sort_order int not null default 100
);
insert into public.sports (key, label, league, emoji, sort_order) values
  ('NBA','NBA','National Basketball Association','🏀',1),
  ('NFL','NFL','National Football League','🏈',2),
  ('MLB','MLB','Major League Baseball','⚾',3),
  ('NHL','NHL','National Hockey League','🏒',4),
  ('NCAAB','College Basketball','NCAA Basketball','🏀',5),
  ('NCAAF','College Football','NCAA Football','🏈',6),
  ('OTHER','Other Sports','Other','🏆',99);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  sport_key text not null references public.sports(key),
  name text not null,
  short_name text,
  logo_url text,
  unique (sport_key, name)
);

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role public.user_role not null default 'member',
  avatar_url text,
  age_verified_at timestamptz,
  jurisdiction text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- plans & subscriptions ----------
create table public.subscription_plans (
  key text primary key,
  name text not null,
  price_cents int not null,
  interval public.plan_interval not null,
  interval_count int not null default 1,
  tagline text,
  features jsonb not null default '[]'::jsonb,
  highlight boolean not null default false,
  active boolean not null default true,
  provider_price_id text
);
insert into public.subscription_plans (key, name, price_cents, interval, tagline, features, highlight) values
  ('daily','Daily Pickle',999,'day','24 hours in the jar.','["24-hour access to premium picks","Full pick analysis","Access to member dashboard"]',false),
  ('weekly','Weekly Pickle',2999,'week','A full week of fresh picks.','["Seven days of premium picks","Full pick analysis","Dashboard access","Pick notifications"]',false),
  ('vip','VIP Pickle Jar',7999,'month','The whole jar, every month.','["Ongoing premium pick access","Full pick analysis","Member dashboard","Pick notifications","Detailed analytics"]',true);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_key text not null references public.subscription_plans(key),
  status public.subscription_status not null default 'incomplete',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  provider text not null default 'manual',
  provider_subscription_id text unique,
  created_at timestamptz not null default now()
);
create index on public.subscriptions (user_id, status, current_period_end);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  amount_cents int not null default 0,
  currency text not null default 'usd',
  description text,
  provider_event_id text unique,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Server-side entitlement check used by RLS and app code
create or replace function public.has_active_subscription(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status in ('active','trialing') and current_period_end > now()
  );
$$;

-- ---------- picks ----------
create table public.picks (
  id uuid primary key default gen_random_uuid(),
  sport_key text not null references public.sports(key),
  league text not null,
  matchup text not null,
  away_team text not null,
  home_team text not null,
  start_time timestamptz not null,
  bet_type text not null,
  selection text not null,
  line text,
  odds int not null,
  stake numeric(6,2) not null check (stake > 0),
  sportsbook text not null default '',
  confidence public.confidence_tier not null default 'play',
  confidence_note text not null default '',
  analysis text not null default '',
  key_stats jsonb not null default '[]'::jsonb,
  status public.pick_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  is_premium boolean not null default true,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- denormalized settlement (source of truth is pick_settlements)
  result public.pick_result not null default 'pending',
  net_units numeric(8,2) not null default 0,
  settled_at timestamptz,
  settled_by uuid references public.profiles(id),
  settlement_note text,
  final_score text
);
create index on public.picks (status, start_time desc);
create index on public.picks (sport_key, status);

-- Immutable publication snapshots (what members actually saw, and when)
create table public.pick_publications (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references public.picks(id) on delete cascade,
  revision int not null default 1,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles(id),
  reason text,
  unique (pick_id, revision)
);

create table public.pick_settlements (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references public.picks(id) on delete cascade,
  result public.pick_result not null check (result <> 'pending'),
  net_units numeric(8,2) not null,
  final_score text,
  note text,
  settled_at timestamptz not null default now(),
  settled_by uuid references public.profiles(id),
  superseded_by uuid references public.pick_settlements(id)
);

create table public.pick_audit_log (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references public.picks(id) on delete cascade,
  action public.audit_action not null,
  actor_id uuid,
  actor_name text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

-- Freeze betting fields once published. Only settlement/status columns may change.
create or replace function public.protect_published_pick()
returns trigger language plpgsql as $$
begin
  if old.published_at is not null then
    if new.sport_key <> old.sport_key or new.matchup <> old.matchup or new.selection <> old.selection
       or new.odds <> old.odds or new.stake <> old.stake or new.bet_type <> old.bet_type
       or new.start_time <> old.start_time or new.analysis <> old.analysis
       or coalesce(new.line,'') <> coalesce(old.line,'') or new.published_at <> old.published_at then
      raise exception 'Published picks are immutable. Record a correction via pick_audit_log instead.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger picks_protect_published before update on public.picks
  for each row execute procedure public.protect_published_pick();

-- Net units calculator (American odds)
create or replace function public.calc_net_units(p_result public.pick_result, p_odds int, p_stake numeric)
returns numeric language sql immutable as $$
  select case
    when p_result = 'win' then round(p_stake * (case when p_odds > 0 then p_odds / 100.0 else 100.0 / abs(p_odds) end), 2)
    when p_result = 'loss' then -p_stake
    else 0 end;
$$;

-- Settlement RPC: single transaction, records settlement + audit + denormalized fields
create or replace function public.settle_pick(p_pick_id uuid, p_result public.pick_result, p_final_score text default null, p_note text default null)
returns public.picks language plpgsql security definer set search_path = public as $$
declare v public.picks; v_net numeric; v_actor text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into v from public.picks where id = p_pick_id for update;
  if v.published_at is null then raise exception 'only published picks can be settled'; end if;
  if v.status = 'settled' then raise exception 'already settled; use correct_settlement'; end if;
  v_net := public.calc_net_units(p_result, v.odds, v.stake);
  insert into public.pick_settlements (pick_id, result, net_units, final_score, note, settled_by)
    values (p_pick_id, p_result, v_net, p_final_score, p_note, auth.uid());
  update public.picks set status='settled', result=p_result, net_units=v_net, settled_at=now(), settled_by=auth.uid(),
    final_score=p_final_score, settlement_note=p_note where id = p_pick_id returning * into v;
  select display_name into v_actor from public.profiles where id = auth.uid();
  insert into public.pick_audit_log (pick_id, action, actor_id, actor_name, after)
    values (p_pick_id, 'settled', auth.uid(), v_actor, jsonb_build_object('result', p_result, 'net_units', v_net, 'final_score', p_final_score));
  -- settle user-tracked bets that mirrored this pick
  update public.user_tracked_bets set result = p_result,
    net_amount = case when p_result='win' then round(stake_amount * (case when odds_received > 0 then odds_received/100.0 else 100.0/abs(odds_received) end),2)
                      when p_result='loss' then -stake_amount else 0 end,
    updated_at = now()
    where pick_id = p_pick_id and result = 'pending';
  -- notify subscribers
  insert into public.notifications (user_id, type, title, body, href)
    select s.user_id, 'settled', 'Pick settled: ' || upper(p_result::text), v.selection || ' — ' || v_net || 'u', '/picks/' || p_pick_id
    from public.subscriptions s where s.status in ('active','trialing') and s.current_period_end > now();
  return v;
end $$;

create or replace function public.correct_settlement(p_pick_id uuid, p_result public.pick_result, p_reason text, p_final_score text default null)
returns public.picks language plpgsql security definer set search_path = public as $$
declare v public.picks; v_net numeric; v_prev uuid; v_new uuid; v_actor text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'reason required'; end if;
  select * into v from public.picks where id = p_pick_id for update;
  if v.status <> 'settled' then raise exception 'pick is not settled'; end if;
  v_net := public.calc_net_units(p_result, v.odds, v.stake);
  select id into v_prev from public.pick_settlements where pick_id = p_pick_id and superseded_by is null order by settled_at desc limit 1;
  insert into public.pick_settlements (pick_id, result, net_units, final_score, note, settled_by)
    values (p_pick_id, p_result, v_net, coalesce(p_final_score, v.final_score), p_reason, auth.uid()) returning id into v_new;
  update public.pick_settlements set superseded_by = v_new where id = v_prev;
  select display_name into v_actor from public.profiles where id = auth.uid();
  insert into public.pick_audit_log (pick_id, action, actor_id, actor_name, before, after, reason)
    values (p_pick_id, 'resettled', auth.uid(), v_actor, jsonb_build_object('result', v.result, 'net_units', v.net_units), jsonb_build_object('result', p_result, 'net_units', v_net), p_reason);
  update public.picks set result=p_result, net_units=v_net, final_score=coalesce(p_final_score, final_score), settlement_note=p_reason where id = p_pick_id returning * into v;
  return v;
end $$;

create or replace function public.publish_pick(p_pick_id uuid)
returns public.picks language plpgsql security definer set search_path = public as $$
declare v public.picks; v_actor text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into v from public.picks where id = p_pick_id for update;
  if v.published_at is not null then raise exception 'already published'; end if;
  update public.picks set status='published', published_at=now() where id = p_pick_id returning * into v;
  insert into public.pick_publications (pick_id, revision, snapshot, published_by) values (p_pick_id, 1, to_jsonb(v), auth.uid());
  select display_name into v_actor from public.profiles where id = auth.uid();
  insert into public.pick_audit_log (pick_id, action, actor_id, actor_name) values (p_pick_id, 'published', auth.uid(), v_actor);
  insert into public.notifications (user_id, type, title, body, href)
    select s.user_id, 'new_pick', 'Fresh pick in the jar', v.sport_key || ': ' || v.selection, '/dashboard/picks'
    from public.subscriptions s where s.status in ('active','trialing') and s.current_period_end > now();
  return v;
end $$;

-- Called by a cron (pg_cron or Vercel cron hitting /api/cron/release)
create or replace function public.release_scheduled_picks()
returns setof public.picks language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from public.picks where status='scheduled' and scheduled_for <= now() loop
    update public.picks set status='published', published_at=now() where id = r.id;
    insert into public.pick_publications (pick_id, revision, snapshot) select id, 1, to_jsonb(p) from public.picks p where id = r.id;
    insert into public.pick_audit_log (pick_id, action, actor_name) values (r.id, 'published', 'Scheduler');
    return query select * from public.picks where id = r.id;
  end loop;
end $$;

-- ---------- user tracked bets ----------
create table public.user_tracked_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pick_id uuid not null references public.picks(id) on delete cascade,
  odds_received int not null,
  stake_amount numeric(10,2) not null check (stake_amount >= 0),
  sportsbook text not null default '',
  result public.pick_result not null default 'pending',
  net_amount numeric(10,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pick_id)
);

-- ---------- notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  new_picks boolean not null default true,
  upcoming_games boolean not null default false,
  settled_results boolean not null default true,
  renewals boolean not null default true,
  push_enabled boolean not null default false
);

-- ---------- site content (single row) ----------
create table public.site_content (
  id int primary key default 1 check (id = 1),
  hero_eyebrow text not null default 'THE PICKLE KNOWS BALL',
  hero_headline text not null default 'BIG PICKS. BIG PERSONALITY. REAL RESULTS.',
  hero_subheadline text not null default 'Data-driven sports picks, transparent performance tracking, and a community that lives for game day. Get access to Mr. Pickle''s latest selections.',
  primary_cta text not null default 'Get Today''s Picks',
  secondary_cta text not null default 'View Our Record',
  announcement text,
  promo_image_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.site_content (id) values (1);

-- ---------- community ----------
create table public.community_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  sport_key text references public.sports(key),
  pinned boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.community_threads(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- storage bucket for promo graphics ----------
insert into storage.buckets (id, name, public) values ('promo', 'promo', true) on conflict do nothing;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.picks enable row level security;
alter table public.pick_publications enable row level security;
alter table public.pick_settlements enable row level security;
alter table public.pick_audit_log enable row level security;
alter table public.user_tracked_bets enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.site_content enable row level security;
alter table public.community_threads enable row level security;
alter table public.community_posts enable row level security;
alter table public.sports enable row level security;
alter table public.teams enable row level security;

create policy "public read sports" on public.sports for select using (true);
create policy "public read teams" on public.teams for select using (true);
create policy "public read plans" on public.subscription_plans for select using (true);
create policy "admin write plans" on public.subscription_plans for all using (public.is_admin()) with check (public.is_admin());

create policy "own profile read" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));
create policy "admin profile update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create policy "own subs" on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());
create policy "own billing" on public.billing_events for select using (auth.uid() = user_id or public.is_admin());

-- Picks: settled/voided picks are public history. Published-but-pending premium
-- picks require an active subscription (or admin). Drafts/scheduled are admin-only.
create policy "picks public history" on public.picks for select using (
  status in ('settled','voided')
  or (status = 'published' and (not is_premium or public.has_active_subscription() or public.is_admin()))
  or public.is_admin()
);
create policy "admin insert picks" on public.picks for insert with check (public.is_admin());
create policy "admin update picks" on public.picks for update using (public.is_admin()) with check (public.is_admin());

create policy "public read publications" on public.pick_publications for select using (
  exists (select 1 from public.picks p where p.id = pick_id and p.status in ('settled','voided')) or public.is_admin()
);
create policy "public read settlements" on public.pick_settlements for select using (true);
create policy "public read audit" on public.pick_audit_log for select using (
  exists (select 1 from public.picks p where p.id = pick_id and p.status in ('settled','voided')) or public.is_admin()
);
create policy "admin write audit" on public.pick_audit_log for insert with check (public.is_admin());
create policy "admin write publications" on public.pick_publications for insert with check (public.is_admin());

create policy "own tracked bets" on public.user_tracked_bets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications for update using (auth.uid() = user_id);
create policy "own prefs" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public read content" on public.site_content for select using (true);
create policy "admin write content" on public.site_content for update using (public.is_admin()) with check (public.is_admin());

create policy "members read threads" on public.community_threads for select using (public.has_active_subscription() or public.is_admin());
create policy "members create threads" on public.community_threads for insert with check (auth.uid() = author_id and (public.has_active_subscription() or public.is_admin()));
create policy "admin manage threads" on public.community_threads for update using (public.is_admin());
create policy "members read posts" on public.community_posts for select using ((not hidden or public.is_admin()) and (public.has_active_subscription() or public.is_admin()));
create policy "members create posts" on public.community_posts for insert with check (auth.uid() = author_id and (public.has_active_subscription() or public.is_admin()));
create policy "admin moderate posts" on public.community_posts for update using (public.is_admin());

-- Realtime for picks + notifications
alter publication supabase_realtime add table public.picks;
alter publication supabase_realtime add table public.notifications;
