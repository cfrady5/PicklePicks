-- OPTIONAL development seed. Everything here is flagged is_demo = true and the
-- UI labels it "Demo data". Do NOT run against production.
-- The app's demo mode (no Supabase env vars) generates an equivalent dataset
-- in memory, so this file is only needed when you want demo rows in a real
-- Supabase project.
--
-- After creating your admin user via Supabase Auth, promote it:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
select 1;
