'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';

export default function InvitationInvalid() {
  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <h1 className="font-heading text-2xl font-bold mb-4 text-foreground">Invalid Invitation</h1>
        <p className="text-muted-foreground">
          This invitation link is invalid or has expired. Please ask for a new invitation.
        </p>
      </Card>
    </PageShell>
  );
}
