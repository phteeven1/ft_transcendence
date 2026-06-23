'use client';

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';

export default function AuthButton() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/signin');
  };

  const handleSignOut = () => {
    logout();
    router.push('/'); // Redirect to landing page
  };

  return (
    <button
      onClick={user ? handleSignOut : handleSignIn}
      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      {user ? 'Sign Out' : 'Sign In'}
    </button>
  );
}