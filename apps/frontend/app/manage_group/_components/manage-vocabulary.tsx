'use client';
import { useRouter } from 'next/navigation';

export default function ManageVocabulary() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/manage_vocabulary')}
      className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded transition-colors"
    >
      Manage Vocabulary
    </button>
  );
}