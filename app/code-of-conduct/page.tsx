import { AppShell } from "@/components/AppShell";


export default function CodeOfConductPage() {
  return (
    <AppShell>
      <article className="legal">
        <h1 className="page-title">Code of conduct</h1>
        <p>OTHacks is intended to be welcoming, safe, and beginner-friendly. Participants, organizers, mentors, judges, volunteers, and sponsors must treat one another with respect.</p>
        <h2>Expected behaviour</h2>
        <ul><li>Be considerate and collaborative.</li><li>Respect personal boundaries, names, pronouns, accessibility needs, and different experience levels.</li><li>Follow school rules, event instructions, and applicable laws.</li><li>Give credit for others’ work and disclose outside code, data, and tools.</li></ul>
        <h2>Unacceptable behaviour</h2>
        <ul><li>Harassment, discrimination, threats, stalking, intimidation, or unwanted sexual attention.</li><li>Deliberate disruption, dangerous conduct, unauthorized access, or misuse of participant data.</li><li>Retaliation against anyone who raises a concern.</li></ul>
        <h2>Reporting</h2><p>Report urgent physical-safety concerns to school staff or emergency services. Other concerns may be reported confidentially to conduct@othacks.xyz. Organizers may warn, remove, or ban participants and may involve school staff or authorities when required.</p>
      </article>
    </AppShell>
  );
}
