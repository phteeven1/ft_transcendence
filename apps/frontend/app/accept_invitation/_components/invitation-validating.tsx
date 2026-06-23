'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';

export default function InvitationValidating() {
  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <p className="text-muted-foreground mt-4">Validating invitation...</p>
      </Card>
    </PageShell>
  );
}
