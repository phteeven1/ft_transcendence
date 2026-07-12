'use client';

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from './ui/button';

export default function AuthButton() {
  const t = useTranslations('nav');
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
      {user ? t('signOut') : t('signIn')}
    </Button>
  );
}
