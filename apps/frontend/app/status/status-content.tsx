'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { healthApi, ApiError } from '@/lib/api';
import type { HealthResponse } from '@/lib/api/health/types';
import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthResponse }
  | { kind: 'error'; message: string };

function StatusBadge({ up, label }: { up: boolean; label: string }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        up ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

export default function StatusContent() {
  const t = useTranslations('status');
  const tCommon = useTranslations('common');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const data = await healthApi.get();
        if (!cancelled) setState({ kind: 'ok', data });
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : t('loadError');
        setState({ kind: 'error', message });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, t]);

  const handleRefresh = () => {
    setState({ kind: 'loading' });
    setRefreshToken((token) => token + 1);
  };

  return (
    <PageShell narrow centered>
      <Card className="w-full space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {state.kind === 'loading' && (
          <p className="text-center text-muted-foreground">{tCommon('loading')}</p>
        )}

        {state.kind === 'error' && (
          <div className="space-y-3 text-center">
            <StatusBadge up={false} label={t('unreachable')} />
            <p className="text-sm text-destructive">{state.message}</p>
          </div>
        )}

        {state.kind === 'ok' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3">
              <span className="font-heading font-semibold text-foreground">{t('overall')}</span>
              <StatusBadge
                up={state.data.status === 'ok'}
                label={state.data.status === 'ok' ? t('healthy') : t('degraded')}
              />
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t('version')}</dt>
                <dd className="font-mono text-foreground">{state.data.version}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('uptime')}</dt>
                <dd className="font-mono text-foreground">
                  {t('uptimeSeconds', { seconds: state.data.uptime })}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">{t('timestamp')}</dt>
                <dd className="font-mono text-foreground">{state.data.timestamp}</dd>
              </div>
            </dl>

            <div className="rounded-lg bg-muted/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="font-heading font-semibold text-foreground">{t('database')}</span>
                <StatusBadge
                  up={state.data.checks.database.status === 'up'}
                  label={
                    state.data.checks.database.status === 'up'
                      ? t('up')
                      : t('down')
                  }
                />
              </div>
              {state.data.checks.database.latencyMs != null && (
                <p className="text-sm text-muted-foreground">
                  {t('latency', { ms: state.data.checks.database.latencyMs })}
                </p>
              )}
              {state.data.checks.database.error && (
                <p className="text-sm text-destructive">{state.data.checks.database.error}</p>
              )}
            </div>
          </div>
        )}

        <Button variant="secondary" fullWidth onClick={handleRefresh}>
          {t('refresh')}
        </Button>
      </Card>
    </PageShell>
  );
}
