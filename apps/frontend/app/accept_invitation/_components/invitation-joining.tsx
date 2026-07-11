'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';

interface IInvitationJoiningProps {
  groupName: string;
}

export default function InvitationJoining({ groupName }: IInvitationJoiningProps) {
  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <p className="text-muted-foreground mt-4">Joining {groupName}...</p>
      </Card>
    </PageShell>
  );
}
