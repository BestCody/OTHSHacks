begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'applications', 'applications table exists');
select has_table('public', 'application_files', 'application_files table exists');
select has_table('public', 'audit_logs', 'audit log table exists');

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.applications'::regclass), 'applications has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.application_files'::regclass), 'application files has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass), 'audit logs has RLS');

select is((select public from storage.buckets where id = 'application-files'), false, 'application file bucket is private');
select is((select file_size_limit from storage.buckets where id = 'application-files'), 5242880::bigint, 'file bucket is limited to five MiB');

select * from finish();
rollback;
