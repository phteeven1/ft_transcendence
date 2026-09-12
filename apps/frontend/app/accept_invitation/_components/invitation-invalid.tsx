'use client';

import { Card } from '../../components/ui/card';
import { useTranslations } from 'next-intl';

export default function InvitationInvalid() {
  const t = useTranslations('invitation.invalid');

  return (
    <div className="page-content page-content--narrow page-content--centered">
      <Card className="w-full text-center">
        <h1 className="font-heading text-2xl font-bold mb-4 text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('message')}
        </p>
      </Card>
    </div>
  );
}
