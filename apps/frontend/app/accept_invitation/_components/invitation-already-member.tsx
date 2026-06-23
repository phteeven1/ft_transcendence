'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface IInvitationAlreadyMemberProps {
  groupName: string;
  onGoToGroup: () => void;
}

export default function InvitationAlreadyMember({
  groupName,
  onGoToGroup,
}: IInvitationAlreadyMemberProps) {
  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <h1 className="font-heading text-2xl font-bold mb-4 text-foreground">Already a Member</h1>
        <p className="text-muted-foreground mb-8">
          You are already a member of {groupName}.
        </p>
        <Button variant="accent" fullWidth onClick={onGoToGroup}>
          Go to Group
        </Button>
      </Card>
    </PageShell>
  );
}
