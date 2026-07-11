'use client';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui';

export default function ManagePlayers() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push('/manage_players')}
      variant="primary"
      fullWidth
      className="clay-action-btn"
    >
      Manage Players
    </Button>
  );
}
