-- Run in your own Supabase project's SQL Editor, once.
-- Signed-out visitors get no database permissions.
create table if not exists public.journal_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint journal_entries_data_object check (jsonb_typeof(data) = 'object')
);
create table if not exists public.journal_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  primary key (user_id, name),
  constraint journal_categories_name_not_empty check (length(trim(name)) between 1 and 100)
);
alter table public.journal_entries enable row level security;
alter table public.journal_categories enable row level security;
revoke all on public.journal_entries,public.journal_categories from anon,authenticated;
grant select,insert,update,delete on public.journal_entries,public.journal_categories to authenticated;

create policy "entries_select_own" on public.journal_entries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "entries_insert_own" on public.journal_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "entries_update_own" on public.journal_entries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "entries_delete_own" on public.journal_entries for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "categories_select_own" on public.journal_categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "categories_insert_own" on public.journal_categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.journal_categories for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories_delete_own" on public.journal_categories for delete to authenticated
  using ((select auth.uid()) = user_id);
