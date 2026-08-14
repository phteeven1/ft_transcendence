'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../context/auth-context';
import { PageShell, Panel } from '../components/ui';
import GroupsPanel from './_components/groups-panel';
import PeoplePanel from './_components/people-panel';

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const t = useTranslations('dashboard');
  const { user, group, player } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (player) return;
    if (!user) {
      router.push('/');
    }
  }, [user, player, router]);

  if (!user || player) return null;

  return (
    <PageShell wide>
      <div className="flex flex-col md:grid md:grid-cols-5 gap-4 lg:gap-6">
        <div className="md:col-span-2 flex flex-col">
          <GroupsPanel />
        </div>

        <div className="md:col-span-3 flex flex-col gap-3">
          {group ? (
            <PeoplePanel />
          ) : (
            <Panel className="p-4 sm:p-5">
              <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground italic">
                {t('selectGroup')}
              </p>
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  );
}
