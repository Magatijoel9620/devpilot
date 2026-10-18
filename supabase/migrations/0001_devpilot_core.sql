-- DevPilot core schema. Apply in Supabase SQL Editor or with Supabase CLI.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Africa/Nairobi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  color text not null default '#0F766E',
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  project_type text not null default 'software' check (project_type in ('software','client_work','personal','business','other')),
  repository_url text,
  last_action text not null default '',
  next_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 300),
  description text not null default '',
  status text not null default 'todo' check (status in ('inbox','todo','in_progress','blocked','done','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  task_type text not null default 'other' check (task_type in ('feature','bug','release','maintenance','admin','idea','other')),
  lifecycle_stage text not null default 'development' check (lifecycle_stage in ('planning','development','testing','release','maintenance')),
  due_at date,
  estimate_minutes integer not null default 30 check (estimate_minutes between 0 and 100000),
  impact_score smallint not null default 3 check (impact_score between 1 and 5),
  next_action text not null default '',
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_parent_not_self check (parent_task_id is null or parent_task_id <> id)
);

create table if not exists public.task_dependencies (
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint dependency_not_self check (task_id <> depends_on_task_id)
);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  available_minutes integer not null default 240 check (available_minutes between 0 and 1440),
  buffer_minutes integer not null default 30 check (buffer_minutes between 0 and 720),
  reflection text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, plan_date)
);

create table if not exists public.daily_plan_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  daily_plan_id uuid not null references public.daily_plans(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  position integer not null default 0,
  planned_minutes integer not null default 30 check (planned_minutes between 0 and 1440),
  state text not null default 'planned' check (state in ('planned','completed','skipped')),
  created_at timestamptz not null default now(),
  unique(daily_plan_id, task_id),
  unique(daily_plan_id, position)
);

create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint session_end_after_start check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists one_active_session_per_owner on public.work_sessions(owner_id) where ended_at is null;

create table if not exists public.task_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null default 'Work note',
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  content text not null,
  category text not null default 'handover' check (category in ('handover','decision','technical','meeting','general')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version text not null,
  status text not null default 'planning' check (status in ('planning','testing','ready','deployed','rolled_back')),
  target_date date,
  release_notes text not null default '',
  deployed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.release_checklist_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid not null references public.releases(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  is_complete boolean not null default false,
  verification_notes text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  rule jsonb not null,
  next_run_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null default 'in_app' check (channel in ('in_app','email','push')),
  status text not null default 'pending' check (status in ('pending','sent','dismissed','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  daily_available_minutes integer not null default 240 check (daily_available_minutes between 0 and 1440),
  daily_buffer_minutes integer not null default 30 check (daily_buffer_minutes between 0 and 720),
  planner_max_tasks smallint not null default 3 check (planner_max_tasks between 1 and 20),
  timezone text not null default 'Africa/Nairobi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.workspace_snapshots (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint workspace_snapshot_is_object check (jsonb_typeof(data) = 'object')
);

create index if not exists projects_owner_status_idx on public.projects(owner_id, status);
create index if not exists tasks_owner_status_due_idx on public.tasks(owner_id, status, due_at);
create index if not exists tasks_project_status_idx on public.tasks(project_id, status);
create index if not exists tasks_owner_created_idx on public.tasks(owner_id, created_at desc);
create index if not exists task_dependencies_owner_idx on public.task_dependencies(owner_id, task_id);
create index if not exists plan_items_owner_idx on public.daily_plan_items(owner_id, daily_plan_id, position);
create index if not exists sessions_owner_started_idx on public.work_sessions(owner_id, started_at desc);
create index if not exists project_notes_owner_project_idx on public.project_notes(owner_id, project_id, created_at desc);
create index if not exists releases_owner_project_idx on public.releases(owner_id, project_id, target_date);
create index if not exists reminders_due_idx on public.reminders(owner_id, status, remind_at);
create index if not exists activity_owner_created_idx on public.activity_log(owner_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['profiles','projects','tasks','daily_plans','project_notes','releases','user_settings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email,''),'@',1))) on conflict (id) do nothing;
  insert into public.user_settings(owner_id) values (new.id) on conflict (owner_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- RLS: account-owned records are visible only to the matching authenticated owner.
do $$ declare t text; begin
  foreach t in array array['projects','tasks','task_dependencies','daily_plans','daily_plan_items','work_sessions','task_notes','project_notes','releases','release_checklist_items','recurrence_rules','reminders','activity_log','user_settings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists owner_select on public.%I',t);
    execute format('create policy owner_select on public.%I for select to authenticated using (owner_id = (select auth.uid()))',t);
    execute format('drop policy if exists owner_insert on public.%I',t);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))',t);
    execute format('drop policy if exists owner_update on public.%I',t);
    execute format('create policy owner_update on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',t);
    execute format('drop policy if exists owner_delete on public.%I',t);
    execute format('create policy owner_delete on public.%I for delete to authenticated using (owner_id = (select auth.uid()))',t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists owner_select on public.profiles;
create policy owner_select on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists owner_insert on public.profiles;
create policy owner_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists owner_update on public.profiles;
create policy owner_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists owner_delete on public.profiles;
create policy owner_delete on public.profiles for delete to authenticated using (id = (select auth.uid()));

alter table public.workspace_snapshots enable row level security;
drop policy if exists owner_select on public.workspace_snapshots;
create policy owner_select on public.workspace_snapshots for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists owner_insert on public.workspace_snapshots;
create policy owner_insert on public.workspace_snapshots for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists owner_update on public.workspace_snapshots;
create policy owner_update on public.workspace_snapshots for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists owner_delete on public.workspace_snapshots;
create policy owner_delete on public.workspace_snapshots for delete to authenticated using (owner_id = (select auth.uid()));

-- Cross-owner references must not be accepted, even if a client attempts to forge IDs.
create or replace function public.validate_task_project_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.project_id is not null and not exists(select 1 from public.projects p where p.id=new.project_id and p.owner_id=new.owner_id) then raise exception 'Project does not belong to task owner'; end if;
  if new.parent_task_id is not null and not exists(select 1 from public.tasks t where t.id=new.parent_task_id and t.owner_id=new.owner_id) then raise exception 'Parent task does not belong to task owner'; end if;
  return new;
end; $$;
drop trigger if exists validate_task_project_owner on public.tasks;
create trigger validate_task_project_owner before insert or update of project_id,parent_task_id,owner_id on public.tasks for each row execute function public.validate_task_project_owner();

create or replace function public.validate_dependency_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.tasks t where t.id=new.task_id and t.owner_id=new.owner_id) or not exists(select 1 from public.tasks t where t.id=new.depends_on_task_id and t.owner_id=new.owner_id) then raise exception 'Dependency tasks must belong to the same owner'; end if;
  if exists(with recursive reach(id) as (select new.depends_on_task_id union select d.depends_on_task_id from public.task_dependencies d join reach r on d.task_id=r.id where d.owner_id=new.owner_id) select 1 from reach where id=new.task_id) then raise exception 'Task dependency cycle detected'; end if;
  return new;
end; $$;
drop trigger if exists validate_dependency_owner on public.task_dependencies;
create trigger validate_dependency_owner before insert or update on public.task_dependencies for each row execute function public.validate_dependency_owner();

create or replace function public.validate_project_child_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name='daily_plan_items' then
    if not exists(select 1 from public.daily_plans p where p.id=new.daily_plan_id and p.owner_id=new.owner_id) or not exists(select 1 from public.tasks t where t.id=new.task_id and t.owner_id=new.owner_id) then raise exception 'Plan and task must belong to the same owner'; end if;
  elsif tg_table_name='work_sessions' or tg_table_name='task_notes' then
    if not exists(select 1 from public.tasks t where t.id=new.task_id and t.owner_id=new.owner_id) then raise exception 'Task must belong to the same owner'; end if;
  elsif tg_table_name='project_notes' or tg_table_name='releases' then
    if not exists(select 1 from public.projects p where p.id=new.project_id and p.owner_id=new.owner_id) then raise exception 'Project must belong to the same owner'; end if;
  elsif tg_table_name='release_checklist_items' then
    if not exists(select 1 from public.releases r where r.id=new.release_id and r.owner_id=new.owner_id) then raise exception 'Release must belong to the same owner'; end if;
  end if;
  return new;
end; $$;

drop trigger if exists validate_plan_item_owner on public.daily_plan_items;
create trigger validate_plan_item_owner before insert or update on public.daily_plan_items for each row execute function public.validate_project_child_owner();
drop trigger if exists validate_work_session_owner on public.work_sessions;
create trigger validate_work_session_owner before insert or update on public.work_sessions for each row execute function public.validate_project_child_owner();
drop trigger if exists validate_task_note_owner on public.task_notes;
create trigger validate_task_note_owner before insert or update on public.task_notes for each row execute function public.validate_project_child_owner();
drop trigger if exists validate_project_note_owner on public.project_notes;
create trigger validate_project_note_owner before insert or update on public.project_notes for each row execute function public.validate_project_child_owner();
drop trigger if exists validate_release_owner on public.releases;
create trigger validate_release_owner before insert or update on public.releases for each row execute function public.validate_project_child_owner();
drop trigger if exists validate_release_item_owner on public.release_checklist_items;
create trigger validate_release_item_owner before insert or update on public.release_checklist_items for each row execute function public.validate_project_child_owner();

-- Note: cycle validation is trigger-enforced, but the app should also detect and explain cycles before saving.
