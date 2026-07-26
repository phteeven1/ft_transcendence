'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useTranslations } from 'next-intl';

interface IInvitationErrorProps {
  errorMessage: string;
  onRetry: () => void;
}

export default function InvitationError({ errorMessage, onRetry }: IInvitationErrorProps) {
  const t = useTranslations('invitation.error');

  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <h1 className="font-heading text-2xl font-bold mb-4 text-foreground">{t('title')}</h1>
        <p className="text-destructive mb-6">{errorMessage}</p>
        <Button variant="accent" fullWidth onClick={onRetry}>
          {t('retry')}
        </Button>
      </Card>
    </PageShell>
  );
}
