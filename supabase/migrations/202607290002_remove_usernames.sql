-- Roll back the temporary username feature. Supabase Auth already owns account identity by email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop function if exists public.is_username_available(text);
drop index if exists public.profiles_username_lower_unique;

alter table public.profiles
  drop constraint if exists profiles_username_format,
  drop column if exists username;
