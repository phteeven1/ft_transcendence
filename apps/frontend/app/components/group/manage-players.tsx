'use client';
import { useRouter } from 'next/navigation';

export default function ManagePlayers() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/manage_players')}
      className="w-full bg-emerald-500 text-white p-2 rounded hover:bg-emerald-600"
    >
      Manage Players
    </button>
  );
}