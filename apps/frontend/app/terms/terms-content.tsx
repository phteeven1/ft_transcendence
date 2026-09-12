'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LegalDocument } from '../components/legal-document';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function TermsOfServiceContent() {
  const t = useTranslations('legal.terms');
  const s = useTranslations('legal.terms.sections');

  return (
    <LegalDocument title={t('title')} lastUpdated={t('lastUpdated')}>
      <Section title={s('agreement.title')}>
        <p>
          {s.rich('agreement.paragraphs.0', {
            link: (chunks) => <Link href="/privacy" className="legal-inline-link">{chunks}</Link>,
          })}
        </p>
        <p>{s('agreement.paragraphs.1')}</p>
      </Section>

      <Section title={s('whoMayUse.title')}>
        <ul>
          <li><strong>{s('whoMayUse.items.0.label')}</strong> {s('whoMayUse.items.0.text')}</li>
          <li><strong>{s('whoMayUse.items.1.label')}</strong> {s('whoMayUse.items.1.text')}</li>
          <li><strong>{s('whoMayUse.items.2.label')}</strong> {s('whoMayUse.items.2.text')}</li>
        </ul>
      </Section>

      <Section title={s('accountsAndSecurity.title')}>
        <p>{s('accountsAndSecurity.intro')}</p>
        <ul>
          <li>{s('accountsAndSecurity.items.0')}</li>
          <li>{s('accountsAndSecurity.items.1')}</li>
          <li>{s('accountsAndSecurity.items.2')}</li>
          <li>{s('accountsAndSecurity.items.3')}</li>
        </ul>
        <p>{s('accountsAndSecurity.suspension')}</p>
      </Section>

      <Section title={s('acceptableUse.title')}>
        <p>{s('acceptableUse.intro')}</p>
        <ul>
          {Array.from({ length: 7 }, (_, i) => (
            <li key={i}>{s(`acceptableUse.items.${i}`)}</li>
          ))}
        </ul>
        <p>{s('acceptableUse.moderation')}</p>
      </Section>

      <Section title={s('userContent.title')}>
        <p>{s('userContent.paragraphs.0')}</p>
        <p>{s('userContent.paragraphs.1')}</p>
      </Section>

      <Section title={s('groupsAndInvitations.title')}>
        <p>{s('groupsAndInvitations.paragraphs.0')}</p>
        <p>{s('groupsAndInvitations.paragraphs.1')}</p>
      </Section>

      <Section title={s('gamesAndMultiplayer.title')}>
        <p>{s('gamesAndMultiplayer.paragraphs.0')}</p>
        <p>{s('gamesAndMultiplayer.paragraphs.1')}</p>
      </Section>

      <Section title={s('thirdPartyServices.title')}>
        <p>{s('thirdPartyServices.paragraphs.0')}</p>
      </Section>

      <Section title={s('disclaimer.title')}>
        <p>{s('disclaimer.paragraphs.0')}</p>
        <p>{s('disclaimer.paragraphs.1')}</p>
      </Section>

      <Section title={s('limitationOfLiability.title')}>
        <p>{s('limitationOfLiability.paragraphs.0')}</p>
        <p>{s('limitationOfLiability.paragraphs.1')}</p>
      </Section>

      <Section title={s('termination.title')}>
        <p>{s('termination.paragraphs.0')}</p>
        <p>{s('termination.paragraphs.1')}</p>
      </Section>

      <Section title={s('changesToTerms.title')}>
        <p>{s('changesToTerms.paragraphs.0')}</p>
      </Section>

      <Section title={s('governingLaw.title')}>
        <p>{s('governingLaw.paragraphs.0')}</p>
      </Section>

      <Section title={s('contact.title')}>
        <p>{s('contact.paragraphs.0')}</p>
      </Section>
    </LegalDocument>
  );
}
