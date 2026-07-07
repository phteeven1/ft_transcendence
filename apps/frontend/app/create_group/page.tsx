'use client';
import { useState, ChangeEvent, SyntheticEvent } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { groupsApi } from '@/lib/api';
import { PageShell } from '../components/ui/page-shell';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';

export default function CreateGroup() {
  const { user, syncGroup } = useAuth();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [showError, setShowError] = useState(false);

  if (!user) {
    router.push('/');
    return null;
  }

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
          Create New Group
        </h1>
        <p className="mb-6 text-muted-foreground">Choose a name for your new group.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Group Name"
            type="text"
            id="groupName"
            name="groupName"
            value={groupName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
            placeholder="Enter a group name"
            required
          />
          <Button type="submit" variant="accent" fullWidth>
            Create Group
          </Button>
        </form>
        <Button
          variant="ghost"
          fullWidth
          className="mt-4"
          onClick={() => router.push('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Card>

      <Modal open={showError} onClose={() => setShowError(false)}>
        Failed to create group. Please try again.
      </Modal>
    </PageShell>
  );
}
