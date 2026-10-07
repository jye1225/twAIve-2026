-- 1. Run the latest supabase/schema.sql first.
-- 2. Replace the username below with the account that should see the teacher dashboard.
-- This changes access permissions, so run it only for a trusted teacher account.

insert into public.teacher_accounts (user_id)
select id
from public.profiles
where username = 'YOUR_TEACHER_USERNAME'
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
