'use client';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui';

export default function ManageVocabulary() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push('/manage_vocabulary')}
      variant="accent"
      fullWidth
      className="clay-action-btn"
    >
      Manage Vocabulary
    </Button>
  );
}
