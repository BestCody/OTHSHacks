import { AppShell } from "@/components/AppShell";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <AppShell>
      <article className="legal">
        <h1 className="page-title">Terms of use</h1>
        <p className="warning">These are operational starter terms, not legal advice. Obtain school-board approval before launch.</p>
        <h2>Eligibility</h2><p>Applicants must meet the event’s published eligibility requirements and provide accurate information.</p>
        <h2>Accounts</h2><p>Keep account credentials private. Organizers may suspend accounts used for abuse, impersonation, unauthorized access, or disruption.</p>
        <h2>Acceptable use</h2><p>Do not attack, probe, overload, scrape, reverse engineer, or bypass access controls on the site. Do not upload malware, illegal material, or documents you are not authorized to share.</p>
        <h2>Event decisions</h2><p>Eligibility and admission decisions are made by the organizers under the published event rules and available capacity.</p>
        <h2>Projects</h2><p>Participants retain ownership of their original work, subject to third-party licences and any separate contest rules. Teams are responsible for deciding ownership among members.</p>
        <h2>Availability</h2><p>The service may be changed or temporarily unavailable for maintenance, security, or operational reasons.</p>
      </article>
    </AppShell>
  );
}
