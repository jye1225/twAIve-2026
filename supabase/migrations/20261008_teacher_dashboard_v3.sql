-- Apply in Supabase SQL Editor after the existing schema is installed.
-- Replaces only the teacher aggregate function and its permissions; no records are deleted.

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
  eligible_training_learners integer := 0;
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
  from public.user_episode_progress
  where scores ->> '_version' = '3';

  select count(distinct p.id)
  into consenting_learners
  from public.profiles p
  join public.user_episode_progress progress on progress.user_id = p.id
  where p.analytics_consent = true and progress.scores ->> '_version' = '3';

  select count(*)
  into eligible_training_records
  from public.profiles p
  join public.user_episode_progress progress on progress.user_id = p.id
  where p.analytics_consent = true
    and progress.scores ->> '_version' = '3'
    and progress.completed = true
    and jsonb_typeof(progress.scores) = 'object'
    and progress.scores <> '{}'::jsonb
    and jsonb_typeof(progress.history) = 'array'
    and jsonb_array_length(case when jsonb_typeof(progress.history) = 'array' then progress.history else '[]'::jsonb end) > 0
    and progress.assessment ? 'pre'
    and progress.assessment ? 'post';

  select count(*)
  into consenting_records
  from public.profiles p
  join public.user_episode_progress progress on progress.user_id = p.id
  where p.analytics_consent = true and progress.scores ->> '_version' = '3';

  select count(*) into eligible_training_learners
  from (
    select progress.user_id
    from public.profiles p
    join public.user_episode_progress progress on progress.user_id = p.id
    cross join lateral jsonb_each_text(
      case when jsonb_typeof(progress.scores) = 'object' then progress.scores else '{}'::jsonb end
    ) score_entry
    where p.analytics_consent = true
      and progress.scores ->> '_version' = '3'
      and progress.episode_id in ('deepfake', 'rumor', 'chatbot', 'assignment', 'privacy')
      and progress.completed = true
      and coalesce(progress.assessment #>> '{pre,level}', '') ~ '^[0-4]$'
      and coalesce(progress.assessment #>> '{post,level}', '') ~ '^[0-4]$'
      and score_entry.key in ('humanCenteredness', 'privacy', 'fairness', 'responsibility', 'safety', 'reliability', 'transparency')
      and score_entry.value ~ '^(100(\.0+)?|([0-9]|[1-9][0-9])(\.[0-9]+)?)$'
    group by progress.user_id
    having count(distinct progress.episode_id) = 5 and count(distinct score_entry.key) = 7
  ) eligible_learners;

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
  from public.user_episode_progress
  where scores ->> '_version' = '3';

  return jsonb_build_object(
    'activeLearners', active_learners,
    'scoringVersion', 3,
    'consentingLearners', consenting_learners,
    'consentingRecords', consenting_records,
    'eligibleTrainingRecords', eligible_training_records,
    'eligibleTrainingLearners', eligible_training_learners,
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
        cross join lateral jsonb_each_text(
          case when jsonb_typeof(progress.scores) = 'object' then progress.scores else '{}'::jsonb end
        ) score_entry
        where progress.scores ->> '_version' = '3' and score_entry.key in (
          'humanCenteredness',
          'privacy',
          'fairness',
          'responsibility',
          'safety',
          'reliability',
          'transparency'
        )
          and score_entry.value ~ '^(100(\.0+)?|([0-9]|[1-9][0-9])(\.[0-9]+)?)$'
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
        where progress.scores ->> '_version' = '3' and history_item.item ? 'rubric'
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
        where scores ->> '_version' = '3'
        group by episode_id
      ) episode_summary
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_teacher_dashboard() from public;
grant execute on function public.get_teacher_dashboard() to authenticated;

notify pgrst, 'reload schema';

