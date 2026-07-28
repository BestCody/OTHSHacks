# Access control

## Roles

- Applicant: sees and edits only their own profile, application, and files.
- Organizer: reads applications and authorized participant information; records decisions.
- Admin: organizer abilities plus role management and operational administration.

## Rules

- UI visibility is never the security boundary. Every route and database request is authorized server-side and through RLS.
- Applicants cannot change application status or their role.
- The service-role key is restricted to server code and CI/operations secrets.
- Organizer accounts must use MFA and individual accounts; no shared passwords.
- Data exports require reauthentication, a business reason, minimum fields, and an audit record. Export functionality is deliberately not included by default.
- Review access monthly during active planning and immediately remove graduating or departing organizers.
