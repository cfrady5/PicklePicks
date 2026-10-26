// RLS / privilege test suite for the Supabase schema, run against PGlite
// (Postgres in WASM) with minimal stand-ins for Supabase's auth/storage
// schemas and API roles.  Run: npm run test:db   (BUNDLE=1 tests setup.sql)
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const dir = new URL("../migrations", import.meta.url).pathname;
const db = new PGlite();
let failures = 0;
const ok = (c, m) => { if (!c) failures++; console.log(c ? "PASS" : "FAIL", m); };
const tryQ = async (sql, params) => { try { return { rows: (await db.query(sql, params)).rows }; } catch (e) { return { error: e.message }; } };

// ---- Supabase platform stand-ins ----
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema storage; create table storage.buckets (id text primary key, name text, public boolean);
create publication supabase_realtime;
-- mimic the new opt-in default: no automatic grants in public
alter default privileges in schema public revoke all on tables from public;
`);

for (const f of (process.env.BUNDLE ? ["../setup.sql"] : fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort())) {
  // exec for multi-statement
  try { await db.exec(fs.readFileSync(`${dir}/${f}`, "utf8")); ok(true, `migration ${f} applied`); } catch (e) { ok(false, `migration ${f}: ${e.message}`); process.exit(1); }
}

const ADMIN = "11111111-1111-1111-1111-111111111111", MEMBER = "22222222-2222-2222-2222-222222222222", FREE = "33333333-3333-3333-3333-333333333333";
await db.exec(`
insert into auth.users (id, email, raw_user_meta_data) values
 ('${ADMIN}','admin@x.com','{"display_name":"Boss"}'), ('${MEMBER}','m@x.com','{}'), ('${FREE}','f@x.com','{}');
update public.profiles set role='admin' where id='${ADMIN}';
insert into public.subscriptions (user_id, plan_key, status, current_period_end) values ('${MEMBER}','vip','active', now() + interval '30 days');
`);
const prof = await db.query(`select id, display_name, role from public.profiles order by email`);
ok(prof.rows.length === 3, `signup trigger created profiles (${prof.rows.map((r) => r.display_name).join(", ")})`);

const as = async (role, uid, sql, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${role};`);
  const r = await tryQ(sql, params);
  await db.exec(`reset role;`);
  return r;
};

// admin creates + publishes + settles
let r = await as("authenticated", ADMIN, `insert into public.picks (sport_key, league, matchup, away_team, home_team, start_time, bet_type, selection, odds, stake) values ('NBA','NBA','A @ B','A','B', now() - interval '3 hours','spread','B -3.5',-110,1) returning id`);
ok(!r.error, `admin can insert a pick ${r.error ?? ""}`);
const pickId = r.rows?.[0]?.id;
r = await as("authenticated", ADMIN, `insert into public.picks (sport_key, league, matchup, away_team, home_team, start_time, bet_type, selection, odds, stake, status) values ('NFL','NFL','C @ D','C','D', now() + interval '1 day','total','Over 44',-105,1,'draft') returning id`);
const draftId = r.rows?.[0]?.id;
r = await as("authenticated", MEMBER, `insert into public.picks (sport_key, league, matchup, away_team, home_team, start_time, bet_type, selection, odds, stake) values ('NBA','NBA','x','x','y', now(),'spread','x',-110,1)`);
ok(!!r.error, `member cannot insert picks (${r.error?.slice(0, 60)})`);

r = await as("authenticated", ADMIN, `select (public.publish_pick($1)).status`, [pickId]);
ok(r.rows?.[0]?.status === "published", `admin publish_pick RPC ${r.error ?? ""}`);
r = await as("authenticated", MEMBER, `select public.publish_pick($1)`, [draftId]);
ok(!!r.error, `member publish_pick rejected (${r.error?.slice(0, 40)})`);

// visibility of pending premium pick
r = await as("anon", null, `select count(*)::int n from public.picks`);
ok(r.rows?.[0]?.n === 0, `anon sees 0 picks while the only published pick is pending premium + 1 draft (got ${r.rows?.[0]?.n} ${r.error ?? ""})`);
r = await as("authenticated", MEMBER, `select count(*)::int n from public.picks`);
ok(r.rows?.[0]?.n === 1, `subscriber sees the pending premium pick but not the draft (got ${r.rows?.[0]?.n})`);
r = await as("authenticated", FREE, `select count(*)::int n from public.picks`);
ok(r.rows?.[0]?.n === 0, `free user does not see pending premium pick (got ${r.rows?.[0]?.n})`);

// member tracks the pick
r = await as("authenticated", MEMBER, `insert into public.user_tracked_bets (user_id, pick_id, odds_received, stake_amount) values ($1,$2,-110,50)`, [MEMBER, pickId]);
ok(!r.error, `member logs a tracked bet ${r.error ?? ""}`);
r = await as("authenticated", FREE, `insert into public.user_tracked_bets (user_id, pick_id, odds_received, stake_amount) values ($1,$2,-110,50)`, [MEMBER, pickId]);
ok(!!r.error, `user cannot write tracked bets for someone else`);

// immutability
r = await as("authenticated", ADMIN, `update public.picks set odds = 150 where id = $1`, [pickId]);
ok(!!r.error && r.error.includes("immutable"), `published pick betting fields are immutable`);

// settle
r = await as("authenticated", ADMIN, `select (public.settle_pick($1, 'win', '110-100')).net_units`, [pickId]);
ok(Number(r.rows?.[0]?.net_units) === 0.91, `settle_pick computes +0.91u (${r.rows?.[0]?.net_units} ${r.error ?? ""})`);
r = await as("authenticated", MEMBER, `select result, net_amount from public.user_tracked_bets where pick_id = $1`, [pickId]);
ok(r.rows?.[0]?.result === "win" && Number(r.rows[0].net_amount) === 45.45, `tracked bet auto-settled to +$45.45 (${JSON.stringify(r.rows?.[0])})`);
r = await as("authenticated", MEMBER, `select count(*)::int n from public.notifications`);
ok(r.rows?.[0]?.n >= 2, `subscriber got publish + settle notifications (${r.rows?.[0]?.n})`);
r = await as("anon", null, `select count(*)::int n from public.picks`);
ok(r.rows?.[0]?.n === 1, `anon now sees the settled pick on the public ledger`);
r = await as("anon", null, `select count(*)::int n from public.pick_audit_log`);
ok(r.rows?.[0]?.n >= 1, `anon can read audit trail of settled picks (${r.rows?.[0]?.n})`);

// correction
r = await as("authenticated", ADMIN, `select (public.correct_settlement($1, 'push', 'stat correction')).result`, [pickId]);
ok(r.rows?.[0]?.result === "push", `correct_settlement records push ${r.error ?? ""}`);
r = await as("anon", null, `select count(*) filter (where superseded_by is not null)::int s, count(*)::int n from public.pick_settlements`);
ok(r.rows?.[0]?.s === 1 && r.rows?.[0]?.n === 2, `prior settlement kept and marked superseded`);

// privilege escalation attempts
r = await as("authenticated", FREE, `update public.profiles set role = 'admin' where id = $1`, [FREE]);
ok(!!r.error, `user cannot promote self to admin (${r.error?.slice(0, 50)})`);
r = await as("authenticated", FREE, `update public.profiles set display_name = 'New Name' where id = $1 returning display_name`, [FREE]);
ok(r.rows?.[0]?.display_name === "New Name", `user can edit own display name ${r.error ?? ""}`);
r = await as("authenticated", FREE, `update public.profiles set display_name = 'hax' where id = $1 returning id`, [MEMBER]);
ok(!r.error && r.rows.length === 0, `user cannot edit someone else's profile`);
r = await as("authenticated", FREE, `insert into public.subscriptions (user_id, plan_key, status, current_period_end) values ($1,'vip','active', now() + interval '1 year')`, [FREE]);
ok(!!r.error, `user cannot grant themselves a subscription`);
r = await as("anon", null, `select public.release_scheduled_picks()`);
ok(!!r.error, `anon cannot call release_scheduled_picks`);
r = await as("authenticated", MEMBER, `select public.release_scheduled_picks()`);
ok(!!r.error, `members cannot call release_scheduled_picks`);
r = await as("service_role", null, `select count(*)::int n from public.release_scheduled_picks()`);
ok(!r.error, `service role can run release_scheduled_picks ${r.error ?? ""}`);
r = await as("anon", null, `select private.is_admin()`);
ok(!r.error && r.rows[0].is_admin === false, `private helper callable by policies, returns false for anon`);
r = await as("authenticated", FREE, `select count(*)::int n from public.profiles`);
ok(r.rows?.[0]?.n === 1, `user sees only own profile (got ${r.rows?.[0]?.n})`);
r = await as("authenticated", ADMIN, `select count(*)::int n from public.profiles`);
ok(r.rows?.[0]?.n === 3, `admin sees all profiles`);

// notifications: member can mark read but not rewrite body
r = await as("authenticated", MEMBER, `update public.notifications set read_at = now() where user_id = $1 returning id`, [MEMBER]);
ok(!r.error && r.rows.length >= 1, `member marks notifications read`);
r = await as("authenticated", MEMBER, `update public.notifications set title = 'x' where user_id = $1`, [MEMBER]);
ok(!!r.error, `member cannot rewrite notification text`);

// community
r = await as("authenticated", MEMBER, `insert into public.community_threads (author_id, title, body) values ($1, 'Game day', 'hi') returning id`, [MEMBER]);
ok(!r.error, `subscriber can start a thread ${r.error ?? ""}`);
r = await as("authenticated", FREE, `insert into public.community_threads (author_id, title, body) values ($1, 'x', 'y')`, [FREE]);
ok(!!r.error, `free user cannot post in community`);

// hype jobs
r = await as("authenticated", ADMIN, `insert into public.hype_jobs (pick_id, data) values ($1, '{}') returning id`, [pickId]);
ok(!r.error, `admin can create hype job ${r.error ?? ""}`);
r = await as("authenticated", MEMBER, `select count(*)::int n from public.hype_jobs`);
ok(r.rows?.[0]?.n === 0, `members cannot see hype jobs`);
r = await as("anon", null, `select count(*)::int n from public.hype_jobs`);
ok(!!r.error || r.rows?.[0]?.n === 0, `anon has no access to hype jobs`);

// content + plans
r = await as("anon", null, `select hero_headline from public.site_content`);
ok(r.rows?.length === 1, `anon reads site content`);
r = await as("authenticated", FREE, `update public.subscription_plans set price_cents = 1 where key = 'vip' returning key`);
ok(!r.error && r.rows.length === 0, `non-admin cannot change prices`);
r = await as("authenticated", ADMIN, `update public.subscription_plans set price_cents = 8999 where key = 'vip' returning price_cents`);
ok(r.rows?.[0]?.price_cents === 8999, `admin can change prices`);

// leftover: FK columns without index
r = await tryQ(`select conrelid::regclass::text t, a.attname c from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum = any(c.conkey) where c.contype='f' and c.connamespace='public'::regnamespace and not exists (select 1 from pg_index i where i.indrelid=c.conrelid and a.attnum = i.indkey[0])`);
console.log("FK columns without a leading index:", r.rows.map((x) => `${x.t}.${x.c}`).join(", ") || "none");
// tables without RLS
r = await tryQ(`select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity`);
ok(r.rows.length === 0, `RLS enabled on every public table ${r.rows.map((x) => x.relname).join(",")}`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
