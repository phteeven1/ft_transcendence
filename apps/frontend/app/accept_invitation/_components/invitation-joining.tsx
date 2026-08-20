'use client';

import { Card } from '../../components/ui/card';
import { useTranslations } from 'next-intl';

interface IInvitationJoiningProps {
  groupName: string;
}

export default function InvitationJoining({ groupName }: IInvitationJoiningProps) {
  const t = useTranslations('invitation');

  return (
    <div className="page-content page-content--narrow page-content--centered">
      <Card className="w-full text-center">
        <p className="text-muted-foreground mt-4">{t('joining', { groupName })}</p>
      </Card>
    </div>
  );
}
