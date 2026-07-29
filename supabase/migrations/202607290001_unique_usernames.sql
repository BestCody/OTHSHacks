-- Add case-insensitive, database-enforced usernames for OTHacks accounts.

alter table public.profiles
add column if not exists username text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_username_format
    check (
      username is null
      or (
        char_length(username) between 3 and 30
        and username = lower(username)
        and username ~ '^[a-z0-9_]+$'
      )
    );
  end if;
end
$$;

create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username))
where username is not null;

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_username is not null
    and lower(trim(p_username)) ~ '^[a-z0-9_]{3,30}$'
    and not exists (
      select 1
      from public.profiles
      where lower(username) = lower(trim(p_username))
    );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := nullif(lower(trim(coalesce(new.raw_user_meta_data ->> 'username', ''))), '');
begin
  if tg_op = 'UPDATE' then
    update public.profiles
    set email = new.email
    where id = new.id;
    return new;
  end if;

  if v_username is null or v_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception using
      message = 'A valid username is required',
      errcode = '22023';
  end if;

  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_username
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username);

  return new;
exception
  when unique_violation then
    raise exception using
      message = 'Username is already taken',
      errcode = '23505';
end;
$$;
