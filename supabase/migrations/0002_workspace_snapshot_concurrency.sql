-- Add optimistic concurrency to the existing personal-workspace snapshot.
-- Existing rows receive revision 1; no user data is rewritten.
alter table public.workspace_snapshots
  add column if not exists revision integer not null default 1;

-- Remove early prototype overloads if this database has seen a pre-release variant.
drop function if exists public.save_workspace_snapshot(jsonb, bigint);
drop function if exists public.save_workspace_snapshot(jsonb, integer);

create or replace function public.save_workspace_snapshot(
  p_data jsonb,
  p_expected_revision integer default null
)
returns table (revision integer, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception using errcode = '22023', message = 'Workspace data must be a JSON object';
  end if;

  if p_expected_revision is null then
    insert into public.workspace_snapshots (owner_id, data, revision, updated_at)
    values (v_owner, p_data, 1, now())
    on conflict (owner_id) do nothing
    returning workspace_snapshots.revision, workspace_snapshots.updated_at
      into revision, updated_at;

    if found then
      return next;
      return;
    end if;

    raise exception using errcode = '40001', message = 'WORKSPACE_CONFLICT';
  end if;

  update public.workspace_snapshots as ws
     set data = p_data,
         revision = ws.revision + 1,
         updated_at = now()
   where ws.owner_id = v_owner
     and ws.revision = p_expected_revision
  returning ws.revision, ws.updated_at into revision, updated_at;

  if not found then
    raise exception using errcode = '40001', message = 'WORKSPACE_CONFLICT';
  end if;

  return next;
end;
$$;

revoke all on function public.save_workspace_snapshot(jsonb, integer) from public, anon;
grant execute on function public.save_workspace_snapshot(jsonb, integer) to authenticated;
