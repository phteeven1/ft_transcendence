'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';
import { useTranslations } from 'next-intl';

export default function InvitationValidating() {
  const t = useTranslations('invitation');

  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <p className="text-muted-foreground mt-4">{t('validating')}</p>
      </Card>
    </PageShell>
  );
}
