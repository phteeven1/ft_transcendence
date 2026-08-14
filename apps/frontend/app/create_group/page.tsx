'use client';
import { useState, useEffect, ChangeEvent, SyntheticEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { groupsApi } from '@/lib/api';
import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';

export default function CreateGroup() {
  const t = useTranslations('dashboard.createGroup');
  const { user, syncGroup } = useAuth();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!user) router.push('/');
  }, [user, router]);

  if (!user) return null;

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    try {
      const data = await groupsApi.create({
        groupName,
        creatorId: user.id,
      });
      const result = await syncGroup(data.id);
      if (result) router.push('/manage_group');
    } catch (error) {
      console.error('Failed to create group:', error);
      setShowError(true);
    }
  };

  return (
    <PageShell narrow centered>
      <Card className="w-full">
        <h1 className="font-heading text-2xl font-bold mb-2 text-foreground">
          {t('title')}
        </h1>
        <p className="mb-6 text-muted-foreground">{t('subtitle')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('groupNameLabel')}
            type="text"
            id="groupName"
            name="groupName"
            value={groupName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
            placeholder={t('groupNamePlaceholder')}
            required
          />
          <Button type="submit" variant="accent" fullWidth>
            {t('submit')}
          </Button>
        </form>
        <Button
          variant="ghost"
          fullWidth
          className="mt-4"
          onClick={() => router.push('/dashboard')}
        >
          {t('backToDashboard')}
        </Button>
      </Card>

      <Dialog
        open={showError}
        onClose={() => setShowError(false)}
        onConfirm={() => setShowError(false)}
        showCancel={false}
      >
        {t('failed')}
      </Dialog>
    </PageShell>
  );
}
