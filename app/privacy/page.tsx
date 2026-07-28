import { AppShell } from "@/components/AppShell";

export const metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <AppShell>
      <article className="legal">
        <h1 className="page-title">Privacy notice</h1>
        <p className="warning"><strong>Organizer action required:</strong> have Oakville Trafalgar High School and the applicable school board review this notice before collecting real participant data.</p>
        <p>OTHacks collects only information needed to operate the event, review applications, provide meals and accessibility support, communicate decisions, respond to emergencies, and keep the event safe.</p>
        <h2>Information we collect</h2>
        <p>Account details, school and grade, application responses, emergency contact information, dietary and accessibility requirements, uploaded documents, security logs, and communication preferences.</p>
        <h2>How it is used</h2>
        <p>Information is used only for event administration, participant support, safety, fraud prevention, legal compliance, and aggregate event reporting. We do not sell personal information.</p>
        <h2>Who can access it</h2>
        <p>Access is restricted to authorized OTHacks organizers and school personnel who need the information for their assigned responsibilities. Service providers such as Supabase and the configured email provider process data on our behalf.</p>
        <h2>Retention</h2>
        <p>Unsuccessful applications and uploaded documents should be deleted within 90 days after the event. Accepted-participant operational records should be deleted within one year unless the school requires a different retention period. Security and audit records may be retained longer when needed to investigate an incident.</p>
        <h2>Your choices</h2>
        <p>You may request access, correction, or deletion by contacting privacy@othacks.ca. Some records may need to be retained for safety, legal, or incident-response reasons.</p>
        <h2>Security and incidents</h2>
        <p>We use access controls, private storage, encryption in transit, audit logs, backups, and monitoring. No system is risk-free. Confirmed incidents are handled under the OTHacks incident-response plan and applicable school and legal requirements.</p>
      </article>
    </AppShell>
  );
}
