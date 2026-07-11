import Link from 'next/link';
import { ReactNode } from 'react';
import { Card } from './ui/card';
import { PageShell } from './ui/page-shell';

type LegalDocumentProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalDocument({ title, lastUpdated, children }: LegalDocumentProps) {
  return (
    <PageShell>
      <Card className="legal-prose">
        <header className="mb-8 border-b border-border/50 pb-6">
          <p className="mb-2 text-sm font-heading font-semibold uppercase tracking-widest text-primary">
            Legal
          </p>
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </header>
        {children}
        <footer className="mt-10 border-t border-border/50 pt-6 text-sm text-muted-foreground">
          <p>
            Questions about these policies? Contact your group administrator or the Dicteé project
            team through your school or organization.
          </p>
          <p className="mt-3">
            See also:{' '}
            <Link href="/privacy" className="legal-inline-link">
              Privacy Policy
            </Link>{' '}
            ·{' '}
            <Link href="/terms" className="legal-inline-link">
              Terms of Service
            </Link>
          </p>
        </footer>
      </Card>
    </PageShell>
  );
}
