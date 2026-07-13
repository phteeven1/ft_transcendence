'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useTranslations } from 'next-intl';

interface IInvitationAlreadyMemberProps {
  groupName: string;
  onGoToGroup: () => void;
}

export default function InvitationAlreadyMember({
  groupName,
  onGoToGroup,
}: IInvitationAlreadyMemberProps) {
  const t = useTranslations('invitation.alreadyMember');

  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <h1 className="font-heading text-2xl font-bold mb-4 text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">
          {t('message', { groupName })}
        </p>
        <Button variant="accent" fullWidth onClick={onGoToGroup}>
          {t('goToGroup')}
        </Button>
      </Card>
    </PageShell>
  );
}
