import type { Metadata } from 'next';
import { LegalDocument } from '../components/legal-document';

export const metadata: Metadata = {
  title: 'Privacy Policy — Dicteé',
  description: 'How Dicteé collects, uses, and protects personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated="June 30, 2026">
      <section>
        <h2>1. Introduction</h2>
        <p>
          Dicteé (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a web application that helps
          families and school groups turn vocabulary lists into multiplayer learning games. This
          Privacy Policy explains what information we collect, why we collect it, how we use it,
          and the choices available to you.
        </p>
        <p>
          Dicteé is designed for use by parents and guardians (&quot;Users&quot;) who manage groups
          and vocabulary, and by children who play as separate &quot;Player&quot; profiles under
          parental supervision. By creating an account or using the service, you agree to this
          policy.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <h3>2.1 Account information (Users / parents)</h3>
        <ul>
          <li>Username and password chosen at registration</li>
          <li>Email address (used for group invitations and account-related messages)</li>
          <li>Optional profile fields you choose to share with group members (e.g. display name)</li>
          <li>Group membership, admin role, and invitation history</li>
        </ul>
        <h3>2.2 Player profiles (children)</h3>
        <ul>
          <li>Player display name and optional passphrase for session access</li>
          <li>Group association, game participation, and scores during active sessions</li>
          <li>
            Player sessions use short-lived tokens stored in the browser session until the session
            ends or expires
          </li>
        </ul>
        <h3>2.3 Content you upload or create</h3>
        <ul>
          <li>Vocabulary lists (words, translations, notes) that you import or enter manually</li>
          <li>
            Files you upload for vocabulary extraction (e.g. PDFs, photos of word lists). Images may
            be processed with OCR and AI-assisted structuring to build vocabulary entries
          </li>
          <li>Group chat messages and system log entries visible within your group</li>
          <li>Game state, moves, and scores generated during multiplayer sessions</li>
        </ul>
        <h3>2.4 Technical and usage data</h3>
        <ul>
          <li>
            Browser type, device information, and IP address as part of normal web server and API
            logs
          </li>
          <li>
            Language preference stored locally in your browser (<code>localStorage</code>)
          </li>
          <li>WebSocket connection metadata needed to run real-time games and group updates</li>
        </ul>
      </section>

      <section>
        <h2>3. How we use your information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Create and manage User and Player accounts</li>
          <li>Operate groups, invitations, vocabulary libraries, and multiplayer games</li>
          <li>Send invitation emails when a group admin invites a parent by email</li>
          <li>Extract vocabulary from uploaded documents and images</li>
          <li>Display chat, activity logs, and game results within your group</li>
          <li>Maintain security, troubleshoot errors, and improve reliability</li>
          <li>Comply with applicable legal obligations</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use your data for third-party
          advertising.
        </p>
      </section>

      <section>
        <h2>4. Children&apos;s privacy</h2>
        <p>
          Player accounts are intended to be created and managed by a parent or guardian through a
          User account. Children should not register a User account without parental consent.
        </p>
        <p>
          We collect only the information needed for gameplay and group participation (player name,
          game activity, scores). Parents control which group a child joins through invitations and
          can end player sessions from the parent dashboard.
        </p>
        <p>
          If you believe we have collected personal information from a child without appropriate
          consent, contact us so we can review and delete the account where required.
        </p>
      </section>

      <section>
        <h2>5. Sharing and third-party services</h2>
        <p>We may share information in these limited situations:</p>
        <ul>
          <li>
            <strong>Within your group:</strong> Other members of the same group can see usernames,
            shared vocabulary, chat messages (according to visibility rules), and game activity
          </li>
          <li>
            <strong>Service providers:</strong> We use infrastructure and tools to run the app,
            including hosting, email delivery (SMTP), and AI/OCR services for vocabulary extraction
            from uploaded files. These providers process data only to perform the service on our
            behalf
          </li>
          <li>
            <strong>Legal requirements:</strong> We may disclose information if required by law or
            to protect the rights, safety, and security of users and the service
          </li>
        </ul>
        <p>
          When you upload images or documents for vocabulary import, file content may be sent to
          automated recognition services to detect and structure words. Do not upload documents
          containing sensitive personal data unrelated to vocabulary learning.
        </p>
      </section>

      <section>
        <h2>6. Data retention</h2>
        <p>
          We retain account and group data for as long as your account or group exists, unless you
          request deletion or we must remove it for legal reasons. Chat logs and game history may be
          kept to support group administration and learning records.
        </p>
        <p>
          Invitation tokens expire after a limited period. Player session tokens expire when the
          session ends or times out.
        </p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We take reasonable measures to protect information against unauthorized access, loss, or
          misuse, including access controls on group data and secure transport (HTTPS in production
          deployments).
        </p>
        <p>
          No online service is completely secure. You are responsible for keeping your password
          confidential and for supervising children&apos;s use of Player sessions.
        </p>
      </section>

      <section>
        <h2>8. Your choices and rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access or update your User profile information</li>
          <li>Leave a group or delete a group you administer (subject to admin rules in the app)</li>
          <li>Request correction or deletion of personal data we hold about you</li>
          <li>Withdraw consent where processing is based on consent</li>
        </ul>
        <p>
          To exercise these rights, use in-app account and group management features or contact your
          group administrator.
        </p>
      </section>

      <section>
        <h2>9. International users</h2>
        <p>
          Dicteé may be hosted and operated from servers in the region chosen by your deployment or
          school. If you use the service from outside that region, your information may be
          transferred to and processed in that location.
        </p>
      </section>

      <section>
        <h2>10. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the revised version on
          this page and update the &quot;Last updated&quot; date. Continued use of Dicteé after
          changes take effect constitutes acceptance of the updated policy.
        </p>
      </section>
    </LegalDocument>
  );
}
