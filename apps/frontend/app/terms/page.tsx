import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '../components/legal-document';

export const metadata: Metadata = {
  title: 'Terms of Service — Dicteé',
  description: 'Terms and conditions for using the Dicteé vocabulary learning platform.',
};

export default function TermsOfServicePage() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated="June 30, 2026">
      <section>
        <h2>1. Agreement</h2>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of Dicteé, including
          our website, API, multiplayer games, group features, and related services
          (&quot;Service&quot;). By registering an account, joining a group, or using the Service in
          any way, you agree to these Terms and to our{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          If you do not agree, do not use the Service. If you are accepting these Terms on behalf of
          a child or organization, you represent that you have authority to do so.
        </p>
      </section>

      <section>
        <h2>2. Who may use Dicteé</h2>
        <ul>
          <li>
            <strong>Users (parents/guardians):</strong> Must be old enough to enter a binding
            agreement in their jurisdiction (typically 18 or the age of majority). Users manage
            groups, vocabulary, invitations, and Player profiles.
          </li>
          <li>
            <strong>Players (children):</strong> May use Player profiles created under a User
            account. Players access games through session links or passphrases provided by a parent
            or group admin.
          </li>
          <li>
            <strong>Groups:</strong> Access is invitation-only. You may only join groups to which you
            have been invited or that you create yourself.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Accounts and security</h2>
        <p>You agree to:</p>
        <ul>
          <li>Provide accurate registration information and keep it up to date</li>
          <li>Maintain the confidentiality of your password and player session credentials</li>
          <li>Notify your group admin or account owner if you suspect unauthorized access</li>
          <li>Accept responsibility for activity under your account unless you report misuse promptly</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these Terms or pose a risk to other
          users.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You may not use Dicteé to:</p>
        <ul>
          <li>Harass, bully, or threaten other users, especially minors</li>
          <li>Upload unlawful, offensive, or sexually explicit content</li>
          <li>Upload personal data of third parties without permission (beyond vocabulary learning materials)</li>
          <li>Attempt to bypass security, scrape the Service, or disrupt games or servers</li>
          <li>Impersonate another person or misrepresent your affiliation with a group</li>
          <li>Use automated bots to play games or spam group chat</li>
          <li>Reverse engineer or resell the Service except as permitted by applicable open-source licenses</li>
        </ul>
        <p>
          Group admins may remove members who breach group rules. We may remove content or restrict
          access at our discretion to protect the community.
        </p>
      </section>

      <section>
        <h2>5. User content and vocabulary</h2>
        <p>
          You retain ownership of vocabulary lists, messages, and other content you submit
          (&quot;User Content&quot;). By submitting User Content, you grant Dicteé a non-exclusive,
          worldwide license to host, store, display, and process that content solely to operate the
          Service for you and your group—including OCR and AI-assisted extraction when you upload
          files.
        </p>
        <p>
          You represent that you have the right to upload User Content and that it does not infringe
          third-party intellectual property or privacy rights.
        </p>
      </section>

      <section>
        <h2>6. Groups, invitations, and admin actions</h2>
        <p>
          Group creators become administrators with tools to invite members, manage vocabulary,
          moderate chat visibility, and remove members. Admin actions (expulsions, promotions, group
          deletion) are logged in the group activity feed where configured.
        </p>
        <p>
          Invitations sent by email include a unique link. Do not share invitation links publicly;
          they are intended for specific recipients invited to your class or family group.
        </p>
      </section>

      <section>
        <h2>7. Games and multiplayer features</h2>
        <p>
          Multiplayer games rely on real-time connections. We do not guarantee uninterrupted
          availability. Scores and game outcomes are stored for display within your group session.
          Game rules are defined in the application; disputes between players should be resolved by
          parents or group admins.
        </p>
        <p>
          &quot;Play Now&quot; player sessions are time-limited. Parents are responsible for ending
          sessions and supervising online play.
        </p>
      </section>

      <section>
        <h2>8. Third-party services</h2>
        <p>
          The Service may integrate email delivery, optical character recognition, and language
          models to process uploaded vocabulary materials. Your use of those features is also subject
          to the policies of the underlying providers where applicable.
        </p>
      </section>

      <section>
        <h2>9. Disclaimer of warranties</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
          OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          We do not warrant that the Service will be error-free, secure, or suitable for every
          educational context. Vocabulary extracted automatically from photos or PDFs may contain
          errors; always review imported lists before use in class or homework.
        </p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, DICTEÉ AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          DATA, PROFITS, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
        </p>
        <p>
          Our total liability for any claim relating to the Service is limited to the amount you paid
          us for the Service in the twelve months before the claim, or zero if the Service is
          provided free of charge.
        </p>
      </section>

      <section>
        <h2>11. Termination</h2>
        <p>
          You may stop using the Service at any time. Group admins may delete groups they manage.
          We may suspend or terminate access if you violate these Terms or if continued operation
          poses legal or security risks.
        </p>
        <p>
          Sections that by their nature should survive termination (including disclaimers, limitation
          of liability, and governing law) will remain in effect.
        </p>
      </section>

      <section>
        <h2>12. Changes to the Service and Terms</h2>
        <p>
          We may modify features or these Terms from time to time. Material changes will be posted
          on this page with an updated date. Your continued use after changes become effective
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>13. Governing law</h2>
        <p>
          These Terms are governed by the laws applicable in the jurisdiction of the organization
          operating this Dicteé deployment, without regard to conflict-of-law principles. Courts in
          that jurisdiction will have exclusive venue for disputes, unless mandatory consumer
          protection laws in your country require otherwise.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          For questions about these Terms, contact your group administrator or the team responsible
          for hosting this Dicteé instance.
        </p>
      </section>
    </LegalDocument>
  );
}
