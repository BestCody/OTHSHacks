-- OTHacks production schema
-- Apply with: supabase db push

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('applicant', 'organizer', 'admin');
create type public.application_status as enum ('draft', 'submitted', 'accepted', 'waitlisted', 'rejected');
create type public.file_scan_status as enum ('pending', 'clean', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text check (email is null or char_length(email) <= 254),
  full_name text not null default '' check (char_length(full_name) <= 120),
  school text check (school is null or char_length(school) <= 160),
  grade text check (grade is null or grade in ('9','10','11','12','other')),
  role public.app_role not null default 'applicant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status public.application_status not null default 'draft',
  legal_name text check (legal_name is null or char_length(legal_name) <= 120),
  preferred_name text check (preferred_name is null or char_length(preferred_name) <= 80),
  school text check (school is null or char_length(school) <= 160),
  grade text check (grade is null or grade in ('9','10','11','12','other')),
  dietary_requirements text check (dietary_requirements is null or char_length(dietary_requirements) <= 1000),
  accessibility_needs text check (accessibility_needs is null or char_length(accessibility_needs) <= 1000),
  emergency_contact_name text check (emergency_contact_name is null or char_length(emergency_contact_name) <= 120),
  emergency_contact_phone text check (emergency_contact_phone is null or char_length(emergency_contact_phone) <= 40),
  experience_level text check (experience_level is null or experience_level in ('new','beginner','intermediate','advanced')),
  project_interests text check (project_interests is null or char_length(project_interests) <= 1200),
  code_of_conduct_accepted boolean not null default false,
  privacy_accepted boolean not null default false,
  guardian_consent_confirmed boolean not null default false,
  submitted_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 1024),
  original_name text not null check (char_length(original_name) between 1 and 240),
  mime_type text not null check (mime_type in ('application/pdf','image/png','image/jpeg')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  scan_status public.file_scan_status not null default 'pending',
  scan_details text check (scan_details is null or char_length(scan_details) <= 1000),
  scanned_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) <= 120),
  entity_type text not null check (char_length(entity_type) <= 120),
  entity_id text check (entity_id is null or char_length(entity_id) <= 200),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table private.rate_limits (
  identifier text not null,
  action text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (identifier, action, window_start)
);

create index applications_status_idx on public.applications(status);
create index applications_created_at_idx on public.applications(created_at desc);
create index application_files_user_idx on public.application_files(user_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index rate_limits_cleanup_idx on private.rate_limits(window_start);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.applications
for each row execute function public.set_updated_at();

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

create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('organizer','admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_organizer() from public, anon;
grant execute on function public.is_organizer() to authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators may change roles';
  end if;
  if new.id is distinct from old.id then
    raise exception 'Profile owner cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_escalation();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_role_escalation() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_files enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own_or_organizer"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.is_organizer());

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "applications_select_own_or_organizer"
on public.applications for select to authenticated
using ((select auth.uid()) = user_id or public.is_organizer());

create policy "application_files_select_own_or_organizer"
on public.application_files for select to authenticated
using ((select auth.uid()) = user_id or public.is_organizer());


create policy "audit_logs_select_organizer"
on public.audit_logs for select to authenticated
using (public.is_organizer());

revoke all on public.profiles, public.applications, public.application_files, public.audit_logs from anon;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, school, grade) on public.profiles to authenticated;
grant select on public.applications to authenticated;
grant select on public.application_files to authenticated;
grant select on public.audit_logs to authenticated;

create or replace function public.save_my_application(p_payload jsonb, p_submit boolean default false)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.applications;
  v_result public.applications;
  v_status public.application_status;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_existing from public.applications where user_id = v_user_id for update;
  if found and v_existing.status in ('accepted','waitlisted','rejected') then
    raise exception 'Application is locked after a final decision';
  end if;

  if p_submit then
    if coalesce(trim(p_payload ->> 'legalName'), '') = ''
      or coalesce(trim(p_payload ->> 'school'), '') = ''
      or coalesce(trim(p_payload ->> 'emergencyContactName'), '') = ''
      or coalesce(trim(p_payload ->> 'emergencyContactPhone'), '') = ''
      or coalesce((p_payload ->> 'codeOfConductAccepted')::boolean, false) is not true
      or coalesce((p_payload ->> 'privacyAccepted')::boolean, false) is not true then
      raise exception 'Required submission fields are missing';
    end if;
    v_status := 'submitted';
  else
    v_status := coalesce(v_existing.status, 'draft');
  end if;

  insert into public.applications (
    user_id, status, legal_name, preferred_name, school, grade,
    dietary_requirements, accessibility_needs, emergency_contact_name,
    emergency_contact_phone, experience_level, project_interests,
    code_of_conduct_accepted, privacy_accepted, guardian_consent_confirmed,
    submitted_at
  ) values (
    v_user_id,
    v_status,
    nullif(trim(p_payload ->> 'legalName'), ''),
    nullif(trim(p_payload ->> 'preferredName'), ''),
    nullif(trim(p_payload ->> 'school'), ''),
    nullif(trim(p_payload ->> 'grade'), ''),
    nullif(trim(p_payload ->> 'dietaryRequirements'), ''),
    nullif(trim(p_payload ->> 'accessibilityNeeds'), ''),
    nullif(trim(p_payload ->> 'emergencyContactName'), ''),
    nullif(trim(p_payload ->> 'emergencyContactPhone'), ''),
    nullif(trim(p_payload ->> 'experienceLevel'), ''),
    nullif(trim(p_payload ->> 'projectInterests'), ''),
    coalesce((p_payload ->> 'codeOfConductAccepted')::boolean, false),
    coalesce((p_payload ->> 'privacyAccepted')::boolean, false),
    coalesce((p_payload ->> 'guardianConsentConfirmed')::boolean, false),
    case when p_submit then now() else null end
  )
  on conflict (user_id) do update set
    status = excluded.status,
    legal_name = excluded.legal_name,
    preferred_name = excluded.preferred_name,
    school = excluded.school,
    grade = excluded.grade,
    dietary_requirements = excluded.dietary_requirements,
    accessibility_needs = excluded.accessibility_needs,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    experience_level = excluded.experience_level,
    project_interests = excluded.project_interests,
    code_of_conduct_accepted = excluded.code_of_conduct_accepted,
    privacy_accepted = excluded.privacy_accepted,
    guardian_consent_confirmed = excluded.guardian_consent_confirmed,
    submitted_at = case when p_submit then coalesce(public.applications.submitted_at, now()) else public.applications.submitted_at end
  returning * into v_result;

  update public.application_files
  set application_id = v_result.id
  where user_id = v_user_id and application_id is null;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (v_user_id, case when p_submit then 'application.submitted' else 'application.saved' end, 'application', v_result.id::text, '{}'::jsonb);

  return v_result;
end;
$$;

revoke all on function public.save_my_application(jsonb, boolean) from public, anon;
grant execute on function public.save_my_application(jsonb, boolean) to authenticated;

create or replace function public.set_application_status(
  p_application_id uuid,
  p_status public.application_status,
  p_note text default ''
)
returns table(id uuid, status public.application_status, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if not public.is_organizer() then raise exception 'Organizer role required'; end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then raise exception 'MFA verification required'; end if;

  update public.applications a
  set status = p_status,
      decision_note = nullif(trim(p_note), ''),
      decided_at = case when p_status in ('accepted','waitlisted','rejected') then now() else null end,
      decided_by = case when p_status in ('accepted','waitlisted','rejected') then v_actor else null end
  where a.id = p_application_id;

  if not found then raise exception 'Application not found'; end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (v_actor, 'application.status_changed', 'application', p_application_id::text, jsonb_build_object('status', p_status, 'note', left(coalesce(p_note,''), 250)));

  return query
  select a.id, a.status, p.email
  from public.applications a join public.profiles p on p.id = a.user_id
  where a.id = p_application_id;
end;
$$;

revoke all on function public.set_application_status(uuid, public.application_status, text) from public, anon;
grant execute on function public.set_application_status(uuid, public.application_status, text) to authenticated;

create or replace function public.consume_rate_limit(
  p_action text,
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_identifier) < 16 then
    return false;
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limits(identifier, action, window_start, request_count)
  values (p_identifier, left(p_action, 80), v_window, 1)
  on conflict (identifier, action, window_start)
  do update set request_count = private.rate_limits.request_count + 1
  returning request_count into v_count;

  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

-- Supabase Storage: private files only. The application stores objects under <user_id>/<random>.<ext>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('application-files', 'application-files', false, 5242880, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- No anon/authenticated Storage policies are created. All uploads and downloads flow through authenticated server routes using the server-only service role.

-- Scheduled retention helper. Run from a trusted scheduled job after school approval.
create or replace function public.delete_expired_application_data(p_before timestamptz)
returns table(deleted_applications bigint, deleted_file_records bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apps bigint;
  v_files bigint;
begin
  if current_user not in ('postgres', 'service_role') then raise exception 'Service role required'; end if;
  delete from public.application_files where created_at < p_before and user_id in (
    select user_id from public.applications where status in ('rejected','draft') and updated_at < p_before
  );
  get diagnostics v_files = row_count;
  delete from public.applications where status in ('rejected','draft') and updated_at < p_before;
  get diagnostics v_apps = row_count;
  return query select v_apps, v_files;
end;
$$;
revoke all on function public.delete_expired_application_data(timestamptz) from public, anon, authenticated;
grant execute on function public.delete_expired_application_data(timestamptz) to service_role;

-- Database-level MFA gate: organizer access is allowed only from AAL2 sessions.
create policy "profiles_organizer_requires_aal2"
on public.profiles as restrictive for select to authenticated
using (
  (select auth.uid()) = id
  or not public.is_organizer()
  or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);

create policy "applications_organizer_requires_aal2"
on public.applications as restrictive for select to authenticated
using (
  (select auth.uid()) = user_id
  or not public.is_organizer()
  or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);

create policy "application_files_organizer_requires_aal2"
on public.application_files as restrictive for select to authenticated
using (
  (select auth.uid()) = user_id
  or not public.is_organizer()
  or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);

create policy "audit_logs_require_aal2"
on public.audit_logs as restrictive for select to authenticated
using (coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2');
