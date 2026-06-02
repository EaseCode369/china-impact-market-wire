create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'disabled')),
  role text not null default 'client' check (role in ('client', 'vip', 'admin')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, status, role)
  values (new.id, coalesce(new.email, ''), 'pending', 'client')
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

comment on table public.profiles is '客户访问状态表：pending 待审核，approved 已开通，disabled 已禁用。';
