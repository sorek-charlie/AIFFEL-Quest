-- Apply once in the Supabase test project's SQL Editor. Never use service-role for app CRUD.
create table public.orbit_todos (
  id uuid not null default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  completed boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);
alter table public.orbit_todos enable row level security;
alter table public.orbit_todos force row level security;
revoke all on public.orbit_todos from anon;
grant select, insert, update, delete on public.orbit_todos to authenticated;
create policy todo_select on public.orbit_todos for select to authenticated
using ((select auth.uid()) = owner_id);
create policy todo_insert on public.orbit_todos for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy todo_update on public.orbit_todos for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy todo_delete on public.orbit_todos for delete to authenticated
using ((select auth.uid()) = owner_id);
