create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  target_language text,
  default_level text check (default_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_text text not null,
  detected_source_language text,
  target_language text not null,
  target_level text not null check (target_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  adapted_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_title_not_blank check (length(btrim(title)) > 0),
  constraint documents_source_text_not_blank check (length(btrim(source_text)) > 0),
  constraint documents_adapted_text_not_blank check (length(btrim(adapted_text)) > 0)
);

create index documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.documents enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read their own documents"
on public.documents for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own documents"
on public.documents for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own documents"
on public.documents for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own documents"
on public.documents for delete
to authenticated
using ((select auth.uid()) = user_id);
