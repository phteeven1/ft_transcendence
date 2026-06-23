'use client';

import { PageShell } from '../../components/ui/page-shell';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface IInvitationErrorProps {
  errorMessage: string;
  onRetry: () => void;
}

export default function InvitationError({ errorMessage, onRetry }: IInvitationErrorProps) {
  return (
    <PageShell narrow centered>
      <Card className="w-full text-center">
        <h1 className="font-heading text-2xl font-bold mb-4 text-foreground">Something went wrong</h1>
        <p className="text-destructive mb-6">{errorMessage}</p>
        <Button variant="accent" fullWidth onClick={onRetry}>
          Try Again
        </Button>
      </Card>
    </PageShell>
  );
}
