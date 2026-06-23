'use client';

import Link from 'next/link';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { PageShell } from './components/ui/page-shell';

export default function Home() {
  return (
    <PageShell centered>
      <Card variant="feature" className="text-center max-w-2xl mx-auto">
        <p className="text-sm font-heading font-semibold uppercase tracking-widest text-primary mb-2">
          Learn words through play
        </p>
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
          Dicteé
        </h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Welcome to Dicteé — the fun app for turning vocabulary lists into learning games.
          Upload word lists, invite other parents from the class, then set up a direct link
          for your child to play with friends.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button variant="accent" size="lg">
              Get Started
            </Button>
          </Link>
          <Link href="/signin">
            <Button variant="secondary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto w-full">
        {[
          { title: 'Upload lists', text: 'Import vocabulary from PDFs or photos' },
          { title: 'Invite parents', text: 'Create a group for your class' },
          { title: 'Kids play', text: 'Word games that feel like toys' },
        ].map((item) => (
          <Card key={item.title} className="text-center">
            <h2 className="font-heading text-lg font-bold text-primary mb-2">{item.title}</h2>
            <p className="text-sm text-muted-foreground">{item.text}</p>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
