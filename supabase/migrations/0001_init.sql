-- Mr. Pickle's Picks — core schema
--
-- Written for Supabase projects where new tables are NOT automatically
-- exposed to the Data API: every table, function and schema below has
-- explicit, least-privilege grants, and RLS is enabled on every table in
-- the exposed `public` schema. SECURITY DEFINER helpers live in the
-- non-exposed `private` schema.

create schema if not exists private;

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

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- display_name comes from user-editable metadata; it is cosmetic only and
  -- never used for authorization. Roles live in public.profiles.role.
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure private.handle_new_user();

-- Authorization helpers (SECURITY DEFINER so policies on profiles/subscriptions
-- don't recurse). They only ever answer questions about the calling user.
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;


-- ---------- plans & subscriptions ----------
create table public.subscription_plans (
  key text primary key,
  name text not null,
  price_cents int not null check (price_cents >= 0),
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
create index subscriptions_user_status_idx on public.subscriptions (user_id, status, current_period_end);
create index subscriptions_plan_key_idx on public.subscriptions (plan_key);

create or replace function private.has_active_subscription()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = (select auth.uid()) and status in ('active','trialing') and current_period_end > now()
  );
$$;

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
create index billing_events_user_idx on public.billing_events (user_id, created_at desc);

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
  odds int not null check (odds <= -100 or odds >= 100),
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
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- denormalized settlement (source of truth is pick_settlements)
  result public.pick_result not null default 'pending',
  net_units numeric(8,2) not null default 0,
  settled_at timestamptz,
  settled_by uuid references public.profiles(id) on delete set null,
  settlement_note text,
  final_score text
);
create index picks_status_start_idx on public.picks (status, start_time desc);
create index picks_sport_status_idx on public.picks (sport_key, status);
create index picks_scheduled_idx on public.picks (scheduled_for) where status = 'scheduled';
create index picks_created_by_idx on public.picks (created_by);
create index picks_settled_by_idx on public.picks (settled_by);

-- Immutable publication snapshots (what members actually saw, and when)
create table public.pick_publications (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references public.picks(id) on delete cascade,
  revision int not null default 1,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles(id) on delete set null,
  reason text,
  unique (pick_id, revision)
);
create index pick_publications_published_by_idx on public.pick_publications (published_by);

create table public.pick_settlements (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references public.picks(id) on delete cascade,
  result public.pick_result not null check (result <> 'pending'),
  net_units numeric(8,2) not null,
  final_score text,
  note text,
  settled_at timestamptz not null default now(),
  settled_by uuid references public.profiles(id) on delete set null,
  superseded_by uuid references public.pick_settlements(id)
);
create index pick_settlements_pick_idx on public.pick_settlements (pick_id, settled_at);
create index pick_settlements_settled_by_idx on public.pick_settlements (settled_by);
create index pick_settlements_superseded_by_idx on public.pick_settlements (superseded_by);

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
create index pick_audit_log_pick_idx on public.pick_audit_log (pick_id, created_at);

-- Freeze betting fields once published. Only settlement/status columns may change.
create or replace function private.protect_published_pick()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.published_at is not null then
    if new.sport_key <> old.sport_key or new.matchup <> old.matchup or new.selection <> old.selection
       or new.odds <> old.odds or new.stake <> old.stake or new.bet_type <> old.bet_type
       or new.start_time <> old.start_time or new.analysis <> old.analysis
       or coalesce(new.line,'') <> coalesce(old.line,'') or new.published_at is distinct from old.published_at then
      raise exception 'Published picks are immutable. Record a correction via pick_audit_log instead.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger picks_protect_published before update on public.picks
  for each row execute procedure private.protect_published_pick();

-- Net units calculator (American odds)
create or replace function public.calc_net_units(p_result public.pick_result, p_odds int, p_stake numeric)
returns numeric language sql immutable set search_path = '' as $$
  select case
    when p_result = 'win' then round(p_stake * (case when p_odds > 0 then p_odds / 100.0 else 100.0 / abs(p_odds) end), 2)
    when p_result = 'loss' then -p_stake
    else 0 end;
$$;

-- ---------- user tracked bets ----------
create table public.user_tracked_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pick_id uuid not null references public.picks(id) on delete cascade,
  odds_received int not null check (odds_received <= -100 or odds_received >= 100),
  stake_amount numeric(10,2) not null check (stake_amount >= 0),
  sportsbook text not null default '',
  result public.pick_result not null default 'pending',
  net_amount numeric(10,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pick_id)
);
create index user_tracked_bets_pick_idx on public.user_tracked_bets (pick_id);

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
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

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
create index community_threads_author_idx on public.community_threads (author_id);
create index community_threads_sport_idx on public.community_threads (sport_key);
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.community_threads(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index community_posts_thread_idx on public.community_posts (thread_id, created_at);
create index community_posts_author_idx on public.community_posts (author_id);

-- ---------- admin RPCs (callable by signed-in users; each checks admin itself) ----------
create or replace function public.publish_pick(p_pick_id uuid)
returns public.picks language plpgsql security definer set search_path = '' as $$
declare v public.picks; v_actor text;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  select * into v from public.picks where id = p_pick_id for update;
  if not found then raise exception 'pick not found'; end if;
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

create or replace function public.settle_pick(p_pick_id uuid, p_result public.pick_result, p_final_score text default null, p_note text default null)
returns public.picks language plpgsql security definer set search_path = '' as $$
declare v public.picks; v_net numeric; v_actor text;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  if p_result = 'pending' then raise exception 'result required'; end if;
  select * into v from public.picks where id = p_pick_id for update;
  if not found then raise exception 'pick not found'; end if;
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
  insert into public.notifications (user_id, type, title, body, href)
    select s.user_id, 'settled', 'Pick settled: ' || upper(p_result::text), v.selection || ' — ' || v_net || 'u', '/picks/' || p_pick_id
    from public.subscriptions s where s.status in ('active','trialing') and s.current_period_end > now();
  return v;
end $$;

create or replace function public.correct_settlement(p_pick_id uuid, p_result public.pick_result, p_reason text, p_final_score text default null)
returns public.picks language plpgsql security definer set search_path = '' as $$
declare v public.picks; v_net numeric; v_prev uuid; v_new uuid; v_actor text;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'reason required'; end if;
  if p_result = 'pending' then raise exception 'result required'; end if;
  select * into v from public.picks where id = p_pick_id for update;
  if not found or v.status <> 'settled' then raise exception 'pick is not settled'; end if;
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

-- Server-only: called by the release cron with the service role.
create or replace function public.release_scheduled_picks()
returns setof public.picks language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select id from public.picks where status='scheduled' and scheduled_for <= now() for update skip locked loop
    update public.picks set status='published', published_at=now() where id = r.id;
    insert into public.pick_publications (pick_id, revision, snapshot) select p.id, 1, to_jsonb(p) from public.picks p where p.id = r.id;
    insert into public.pick_audit_log (pick_id, action, actor_name) values (r.id, 'published', 'Scheduler');
    return query select * from public.picks where id = r.id;
  end loop;
end $$;

-- ---------- storage bucket for promo graphics (public read; writes via service role) ----------
insert into storage.buckets (id, name, public) values ('promo', 'promo', true) on conflict do nothing;

-- ---------- privileges ----------
-- Functions: Postgres grants EXECUTE to PUBLIC by default. Lock everything
-- down, then grant back exactly what each role needs.
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated, service_role;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;
-- Policies run as the caller, so the helpers must be executable by API roles.
-- The `private` schema is not exposed through the Data API, so they are not RPC endpoints.
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.has_active_subscription() to anon, authenticated, service_role;
grant execute on function public.calc_net_units(public.pick_result, int, numeric) to anon, authenticated, service_role;
grant execute on function public.publish_pick(uuid) to authenticated, service_role;
grant execute on function public.settle_pick(uuid, public.pick_result, text, text) to authenticated, service_role;
grant execute on function public.correct_settlement(uuid, public.pick_result, text, text) to authenticated, service_role;
grant execute on function public.release_scheduled_picks() to service_role;

grant usage on schema public to anon, authenticated, service_role;

-- Public read-only reference data
grant select on public.sports, public.teams, public.subscription_plans, public.site_content to anon, authenticated;
grant insert, update, delete on public.teams, public.subscription_plans to authenticated;
grant update on public.site_content to authenticated;

-- Public ledger (rows filtered by RLS)
grant select on public.picks, public.pick_publications, public.pick_settlements, public.pick_audit_log to anon, authenticated;
grant insert, update on public.picks to authenticated;
grant insert on public.pick_publications, public.pick_audit_log to authenticated;

-- Profiles: users may read theirs and edit only cosmetic columns. Role changes go through the service role.
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, age_verified_at, jurisdiction) on public.profiles to authenticated;

-- Member-owned data
grant select on public.subscriptions, public.billing_events to authenticated;
grant select, insert, update, delete on public.user_tracked_bets to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert on public.community_threads, public.community_posts to authenticated;
grant update (pinned, locked) on public.community_threads to authenticated;
grant update (hidden) on public.community_posts to authenticated;

-- Server-side code (webhooks, cron, admin actions) uses the service role, which bypasses RLS.
grant select, insert, update, delete on all tables in schema public to service_role;

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

create policy "public read sports" on public.sports for select to anon, authenticated using (true);
create policy "public read teams" on public.teams for select to anon, authenticated using (true);
create policy "admin write teams" on public.teams for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "public read plans" on public.subscription_plans for select to anon, authenticated using (true);
create policy "admin write plans" on public.subscription_plans for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "read own or admin profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));
create policy "update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "read own subscriptions" on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "read own billing" on public.billing_events for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

-- Picks: settled/voided picks are public history. Published-but-pending premium
-- picks require an active subscription (or admin). Drafts/scheduled are admin-only.
create policy "read picks" on public.picks for select to anon, authenticated using (
  status in ('settled','voided')
  or (status = 'published' and (not is_premium or (select private.has_active_subscription()) or (select private.is_admin())))
  or (select private.is_admin())
);
create policy "admin insert picks" on public.picks for insert to authenticated with check ((select private.is_admin()));
create policy "admin update picks" on public.picks for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "read publications" on public.pick_publications for select to anon, authenticated using (
  (select private.is_admin()) or exists (select 1 from public.picks p where p.id = pick_id and p.status in ('settled','voided'))
);
create policy "admin write publications" on public.pick_publications for insert to authenticated with check ((select private.is_admin()));
create policy "read settlements" on public.pick_settlements for select to anon, authenticated using (true);
create policy "read audit" on public.pick_audit_log for select to anon, authenticated using (
  (select private.is_admin()) or exists (select 1 from public.picks p where p.id = pick_id and p.status in ('settled','voided'))
);
create policy "admin write audit" on public.pick_audit_log for insert to authenticated with check ((select private.is_admin()));

create policy "own tracked bets" on public.user_tracked_bets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "read own notifications" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "mark own notifications" on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own prefs" on public.notification_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "public read content" on public.site_content for select to anon, authenticated using (true);
create policy "admin write content" on public.site_content for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "members read threads" on public.community_threads for select to authenticated
  using ((select private.has_active_subscription()) or (select private.is_admin()));
create policy "members create threads" on public.community_threads for insert to authenticated
  with check ((select auth.uid()) = author_id and ((select private.has_active_subscription()) or (select private.is_admin())));
create policy "admin manage threads" on public.community_threads for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "members read posts" on public.community_posts for select to authenticated
  using ((not hidden or (select private.is_admin())) and ((select private.has_active_subscription()) or (select private.is_admin())));
create policy "members create posts" on public.community_posts for insert to authenticated
  with check ((select auth.uid()) = author_id and ((select private.has_active_subscription()) or (select private.is_admin()))
    and not exists (select 1 from public.community_threads t where t.id = thread_id and t.locked));
create policy "admin moderate posts" on public.community_posts for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Realtime for picks + notifications (Realtime respects the RLS above)
alter publication supabase_realtime add table public.picks;
alter publication supabase_realtime add table public.notifications;
