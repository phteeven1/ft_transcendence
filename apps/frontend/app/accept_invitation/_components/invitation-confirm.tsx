'use client';

import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useTranslations } from 'next-intl';

interface IInvitationConfirmProps {
  groupName: string;
  onJoin: () => void;
  onDecline: () => void;
}

export default function InvitationConfirm({
  groupName,
  onJoin,
  onDecline,
}: IInvitationConfirmProps) {
  const t = useTranslations('invitation.confirm');

  return (
    <div className="page-content page-content--narrow page-content--centered">
      <Card className="w-full text-center">
        <h1 className="font-heading text-2xl font-bold mb-4 text-foreground">
          {t('title', { groupName })}
        </h1>
        <p className="mb-8 text-muted-foreground">
          {t('message', { groupName })}
        </p>
        <div className="flex gap-4">
          <Button variant="ghost" className="flex-1" onClick={onDecline}>
            {t('decline')}
          </Button>
          <Button variant="accent" className="flex-1" onClick={onJoin}>
            {t('join')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
