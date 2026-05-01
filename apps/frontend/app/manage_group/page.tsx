'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';

export default function ManageGroup() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="bg-emerald-200 max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Manage Group</h1>
        <p className="text-gray-600">
          Current group id: {user.currentGroup ?? 'none'}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}