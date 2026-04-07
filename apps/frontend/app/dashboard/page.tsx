'use client';

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user } = useAuth(); // Get the logged-in user from auth context
  const router = useRouter(); // For redirecting if not logged in

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/register');
    return null;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="mb-6 text-gray-600">
        This is a dashboard. Welcome, {user.userName}!
      </p>
    </div>
  );
}