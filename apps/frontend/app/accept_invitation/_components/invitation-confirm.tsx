'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

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
  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <h1 className="font-heading text-2xl font-bold mb-4 text-foreground">Join {groupName}?</h1>
        <p className="mb-8 text-muted-foreground">
          Would you like to join the learning group {groupName}?
        </p>
        <div className="flex gap-4">
          <Button variant="ghost" className="flex-1" onClick={onDecline}>
            No thanks
          </Button>
          <Button variant="accent" className="flex-1" onClick={onJoin}>
            Join Group
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
