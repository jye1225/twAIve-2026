-- Run this in the Supabase SQL editor after creating your project.
-- Supabase Auth still stores the password securely.
-- The app shows only username/password, and internally uses username@twaive-user.example.com for Auth.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  auth_email text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists auth_email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists analytics_consent boolean not null default false;
alter table public.profiles drop column if exists email;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;
end $$;

alter table public.profiles enable row level security;

grant usage on schema public to anon, authenticated;
revoke select on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

create or replace function public.is_username_available(requested_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where username = lower(trim(requested_username))
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Anyone can check usernames" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.user_episode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id text not null,
  scene_id text not null,
  score integer not null default 50,
  scores jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  feedback text not null default '',
  story_mode text not null default 'pre',
  assessment jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  ending text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, episode_id)
);

alter table public.user_episode_progress add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.user_episode_progress add column if not exists episode_id text;
alter table public.user_episode_progress add column if not exists scene_id text;
alter table public.user_episode_progress add column if not exists score integer not null default 50;
alter table public.user_episode_progress add column if not exists scores jsonb not null default '{}'::jsonb;
alter table public.user_episode_progress add column if not exists history jsonb not null default '[]'::jsonb;
alter table public.user_episode_progress add column if not exists feedback text not null default '';
alter table public.user_episode_progress add column if not exists story_mode text not null default 'pre';
alter table public.user_episode_progress add column if not exists assessment jsonb not null default '{}'::jsonb;
alter table public.user_episode_progress add column if not exists completed boolean not null default false;
alter table public.user_episode_progress add column if not exists ending text;
alter table public.user_episode_progress add column if not exists created_at timestamptz not null default now();
alter table public.user_episode_progress add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_episode_progress_user_id_episode_id_key'
      and conrelid = 'public.user_episode_progress'::regclass
  ) then
    alter table public.user_episode_progress add constraint user_episode_progress_user_id_episode_id_key unique (user_id, episode_id);
  end if;
end $$;

alter table public.user_episode_progress enable row level security;

grant select, insert, update on public.user_episode_progress to authenticated;

drop policy if exists "Users can read their own progress" on public.user_episode_progress;
drop policy if exists "Users can create their own progress" on public.user_episode_progress;
drop policy if exists "Users can update their own progress" on public.user_episode_progress;

create policy "Users can read their own progress"
on public.user_episode_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own progress"
on public.user_episode_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own progress"
on public.user_episode_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Teacher access is assigned only by a project administrator in the SQL editor.
-- Never expose this table through the browser client.
create table if not exists public.teacher_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.teacher_accounts enable row level security;
revoke all on public.teacher_accounts from anon, authenticated;

create or replace function public.get_teacher_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  active_learners integer := 0;
  consenting_learners integer := 0;
  consenting_records integer := 0;
  eligible_training_records integer := 0;
  completed_episodes integer := 0;
  expected_completions integer := 0;
  completion_rate numeric := 0;
  average_reflection_delta numeric := null;
begin
  if auth.uid() is null or not exists (
    select 1 from public.teacher_accounts where user_id = auth.uid()
  ) then
    raise exception 'teacher access required' using errcode = '42501';
  end if;

  select count(distinct user_id), count(*) filter (where completed)
  into active_learners, completed_episodes
  from public.user_episode_progress;

  select count(distinct p.id)
  into consenting_learners
  from public.profiles p
  join public.user_episode_progress progress on progress.user_id = p.id
  where p.analytics_consent = true;

  select count(*)
  into eligible_training_records
  from public.profiles p
  join public.user_episode_progress progress on progress.user_id = p.id
  where p.analytics_consent = true
    and progress.completed = true
    and jsonb_typeof(progress.scores) = 'object'
    and progress.scores <> '{}'::jsonb
    and jsonb_typeof(progress.history) = 'array'
    and jsonb_array_length(progress.history) > 0
    and progress.assessment ? 'pre'
    and progress.assessment ? 'post';

  select count(*)
  into consenting_records
  from public.profiles p
  join public.user_episode_progress progress on progress.user_id = p.id
  where p.analytics_consent = true;

  expected_completions := active_learners * 5;
  completion_rate := case
    when expected_completions > 0
      then round((completed_episodes::numeric / expected_completions) * 100, 1)
    else 0
  end;

  select round(avg(
    case
      when coalesce(assessment #>> '{pre,level}', '') ~ '^[0-4]$'
       and coalesce(assessment #>> '{post,level}', '') ~ '^[0-4]$'
      then (assessment #>> '{post,level}')::numeric - (assessment #>> '{pre,level}')::numeric
      else null
    end
  ), 2)
  into average_reflection_delta
  from public.user_episode_progress;

  return jsonb_build_object(
    'activeLearners', active_learners,
    'consentingLearners', consenting_learners,
    'consentingRecords', consenting_records,
    'eligibleTrainingRecords', eligible_training_records,
    'completedEpisodes', completed_episodes,
    'expectedCompletions', expected_completions,
    'completionRate', completion_rate,
    'averageReflectionDelta', average_reflection_delta,
    'minimumClusteringSamples', 50,
    'generatedAt', now(),
    'weakestPrinciples', coalesce((
      select jsonb_agg(
        jsonb_build_object('key', principle_key, 'score', average_score, 'samples', sample_count)
        order by average_score asc
      )
      from (
        select
          score_entry.key as principle_key,
          round(avg(score_entry.value::numeric), 1) as average_score,
          count(*) as sample_count
        from public.user_episode_progress progress
        cross join lateral jsonb_each_text(coalesce(progress.scores, '{}'::jsonb)) score_entry
        where score_entry.key in (
          'humanCenteredness',
          'privacy',
          'fairness',
          'responsibility',
          'safety',
          'reliability',
          'transparency'
        )
          and score_entry.value ~ '^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$'
        group by score_entry.key
        order by average_score asc
      ) principle_summary
    ), '[]'::jsonb),
    'questionRiskRates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'episodeId', episode_id,
          'scene', scene,
          'responses', response_count,
          'riskCount', risk_count,
          'riskRate', risk_rate
        ) order by risk_rate desc, response_count desc
      )
      from (
        select
          progress.episode_id,
          coalesce(nullif(history_item.item ->> 'scene', ''), '장면 정보 없음') as scene,
          count(*) as response_count,
          count(*) filter (
            where case
              when coalesce(history_item.item #>> '{rubric,level}', '') ~ '^[0-4]$'
                then (history_item.item #>> '{rubric,level}')::integer
              else 99
            end <= 1
          ) as risk_count,
          round(
            100.0 * count(*) filter (
              where case
                when coalesce(history_item.item #>> '{rubric,level}', '') ~ '^[0-4]$'
                  then (history_item.item #>> '{rubric,level}')::integer
                else 99
              end <= 1
            ) / nullif(count(*), 0),
            1
          ) as risk_rate
        from public.user_episode_progress progress
        cross join lateral jsonb_array_elements(
          case when jsonb_typeof(progress.history) = 'array' then progress.history else '[]'::jsonb end
        ) history_item(item)
        where history_item.item ? 'rubric'
        group by progress.episode_id, coalesce(nullif(history_item.item ->> 'scene', ''), '장면 정보 없음')
        order by risk_rate desc, response_count desc
        limit 12
      ) question_summary
    ), '[]'::jsonb),
    'episodeCompletion', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'episodeId', episode_id,
          'completedLearners', completed_learners,
          'completionRate', episode_rate
        ) order by episode_id
      )
      from (
        select
          episode_id,
          count(distinct user_id) filter (where completed) as completed_learners,
          case
            when active_learners > 0
              then round(100.0 * count(distinct user_id) filter (where completed) / active_learners, 1)
            else 0
          end as episode_rate
        from public.user_episode_progress
        group by episode_id
      ) episode_summary
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_teacher_dashboard() from public;
grant execute on function public.get_teacher_dashboard() to authenticated;

notify pgrst, 'reload schema';
