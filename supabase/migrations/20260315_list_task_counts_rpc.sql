create or replace function get_list_task_counts()
returns table(list_id uuid, count bigint)
language sql stable security definer
as $$
  select list_id, count(*)::bigint
  from tasks
  where status not in ('done', 'canceled')
    and list_id is not null
  group by list_id;
$$;
