'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../context/auth-context';
import { Panel } from '../components/ui';
import GroupsPanel from './_components/groups-panel';
import PeoplePanel from './_components/people-panel';
import { DashboardLiveProvider } from './_hooks/dashboard-live';
import {
  getPlayerSession,
  isLobbyRedirectSuppressed,
} from '@/lib/player-session';

function DashboardLoading() {
  const tCommon = useTranslations('common');

  return (
    <div className="page-content page-content--wide">
      <p className="text-center text-sm text-muted-foreground">{tCommon('loadingEllipsis')}</p>
    </div>
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
  const { user, group, player, authReady, logoutPlayer } = useAuth();
  const router = useRouter();
  const suppressLobbyRedirect = isLobbyRedirectSuppressed();

  useEffect(() => {
    if (!authReady) return;
    const storedSession = getPlayerSession();
    if (isLobbyRedirectSuppressed()) {
      if (player) {
        logoutPlayer();
      }
      if (!user) {
        router.push('/');
      }
      return;
    }
    if (player && storedSession) {
      router.replace('/select_game');
      return;
    }
    if (!user) {
      router.push('/');
    }
  }, [authReady, user, player, router, logoutPlayer]);

  if (
    !authReady ||
    !user ||
    (player && getPlayerSession() && !suppressLobbyRedirect)
  )
    return <DashboardLoading />;

  return (
    <div className="page-content page-content--wide">
      <DashboardLiveProvider
        userId={user.id}
        groupId={group?.id ?? 0}
        enabled={!player}
      >
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
      </DashboardLiveProvider>
    </div>
  );
}
