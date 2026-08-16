'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../context/auth-context';
import { PageShell, Panel } from '../components/ui';
import GroupsPanel from './_components/groups-panel';
import PeoplePanel from './_components/people-panel';

function DashboardLoading() {
  const tCommon = useTranslations('common');

  return (
    <PageShell wide>
      <p className="text-center text-sm text-muted-foreground">{tCommon('loadingEllipsis')}</p>
    </PageShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const t = useTranslations('dashboard');
  const { user, group, player, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;
    if (player) return;
    if (!user) {
      router.push('/');
    }
  }, [authReady, user, player, router]);

  if (!authReady || !user || player) return <DashboardLoading />;

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
