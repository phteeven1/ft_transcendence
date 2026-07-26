'use client';

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

function Paragraphs({ keys }: { keys: string[] }) {
  const t = useTranslations();
  return (
    <>
      {keys.map((key) => (
        <p key={key}>{t(key)}</p>
      ))}
    </>
  );
}

function ItemList({ keys }: { keys: string[] }) {
  const t = useTranslations();
  return (
    <ul>
      {keys.map((key) => (
        <li key={key}>{t(key)}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicyContent() {
  const t = useTranslations('legal.privacy');
  const s = useTranslations('legal.privacy.sections');

  return (
    <LegalDocument title={t('title')} lastUpdated={t('lastUpdated')}>
      <Section title={s('introduction.title')}>
        <Paragraphs keys={['legal.privacy.sections.introduction.paragraphs.0', 'legal.privacy.sections.introduction.paragraphs.1']} />
      </Section>

      <Section title={s('informationWeCollect.title')}>
        <h3>{s('informationWeCollect.accountInfo.title')}</h3>
        <ItemList keys={[
          'legal.privacy.sections.informationWeCollect.accountInfo.items.0',
          'legal.privacy.sections.informationWeCollect.accountInfo.items.1',
          'legal.privacy.sections.informationWeCollect.accountInfo.items.2',
          'legal.privacy.sections.informationWeCollect.accountInfo.items.3',
        ]} />
        <h3>{s('informationWeCollect.playerProfiles.title')}</h3>
        <ItemList keys={[
          'legal.privacy.sections.informationWeCollect.playerProfiles.items.0',
          'legal.privacy.sections.informationWeCollect.playerProfiles.items.1',
          'legal.privacy.sections.informationWeCollect.playerProfiles.items.2',
        ]} />
        <h3>{s('informationWeCollect.contentYouUpload.title')}</h3>
        <ItemList keys={[
          'legal.privacy.sections.informationWeCollect.contentYouUpload.items.0',
          'legal.privacy.sections.informationWeCollect.contentYouUpload.items.1',
          'legal.privacy.sections.informationWeCollect.contentYouUpload.items.2',
          'legal.privacy.sections.informationWeCollect.contentYouUpload.items.3',
        ]} />
        <h3>{s('informationWeCollect.technicalData.title')}</h3>
        <ItemList keys={[
          'legal.privacy.sections.informationWeCollect.technicalData.items.0',
          'legal.privacy.sections.informationWeCollect.technicalData.items.1',
          'legal.privacy.sections.informationWeCollect.technicalData.items.2',
        ]} />
      </Section>

      <Section title={s('howWeUse.title')}>
        <p>{s('howWeUse.intro')}</p>
        <ItemList keys={[
          'legal.privacy.sections.howWeUse.items.0',
          'legal.privacy.sections.howWeUse.items.1',
          'legal.privacy.sections.howWeUse.items.2',
          'legal.privacy.sections.howWeUse.items.3',
          'legal.privacy.sections.howWeUse.items.4',
          'legal.privacy.sections.howWeUse.items.5',
          'legal.privacy.sections.howWeUse.items.6',
        ]} />
        <p>{s('howWeUse.noSell')}</p>
      </Section>

      <Section title={s('childrensPrivacy.title')}>
        <Paragraphs keys={[
          'legal.privacy.sections.childrensPrivacy.paragraphs.0',
          'legal.privacy.sections.childrensPrivacy.paragraphs.1',
          'legal.privacy.sections.childrensPrivacy.paragraphs.2',
        ]} />
      </Section>

      <Section title={s('sharing.title')}>
        <p>{s('sharing.intro')}</p>
        <ul>
          <li><strong>{s('sharing.items.0.label')}</strong> {s('sharing.items.0.text')}</li>
          <li><strong>{s('sharing.items.1.label')}</strong> {s('sharing.items.1.text')}</li>
          <li><strong>{s('sharing.items.2.label')}</strong> {s('sharing.items.2.text')}</li>
        </ul>
        <p>{s('sharing.uploadWarning')}</p>
      </Section>

      <Section title={s('dataRetention.title')}>
        <Paragraphs keys={[
          'legal.privacy.sections.dataRetention.paragraphs.0',
          'legal.privacy.sections.dataRetention.paragraphs.1',
        ]} />
      </Section>

      <Section title={s('security.title')}>
        <Paragraphs keys={[
          'legal.privacy.sections.security.paragraphs.0',
          'legal.privacy.sections.security.paragraphs.1',
        ]} />
      </Section>

      <Section title={s('yourChoices.title')}>
        <p>{s('yourChoices.intro')}</p>
        <ItemList keys={[
          'legal.privacy.sections.yourChoices.items.0',
          'legal.privacy.sections.yourChoices.items.1',
          'legal.privacy.sections.yourChoices.items.2',
          'legal.privacy.sections.yourChoices.items.3',
        ]} />
        <p>{s('yourChoices.contact')}</p>
      </Section>

      <Section title={s('international.title')}>
        <Paragraphs keys={['legal.privacy.sections.international.paragraphs.0']} />
      </Section>

      <Section title={s('changes.title')}>
        <Paragraphs keys={['legal.privacy.sections.changes.paragraphs.0']} />
      </Section>
    </LegalDocument>
  );
}
