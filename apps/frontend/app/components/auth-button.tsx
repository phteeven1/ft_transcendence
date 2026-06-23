'use client';

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export default function AuthButton() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/signin');
  };

  const handleSignOut = () => {
    logout();
    router.push('/');
  };

  return (
    <Button
      variant={user ? 'secondary' : 'primary'}
      size="sm"
      onClick={user ? handleSignOut : handleSignIn}
    >
      {user ? 'Sign Out' : 'Sign In'}
    </Button>
  );
}
