'use client';
import FlagMenu from './flag-menu';
import AuthButton from './auth-button';
import ProfileMenu from './profile-menu';
import { useAuth } from '../context/auth-context';
import { useTranslations } from 'next-intl';

export default function TopBar() {
  const t = useTranslations('nav');
  const { user, player } = useAuth();

  return (
    <header className="clay-topbar flex items-center justify-between px-4 md:px-6 py-3">
      <div className="flex items-center gap-4 min-w-0">
        <span className="font-heading font-bold text-xl text-primary shrink-0">
          {t('brand')}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <FlagMenu />
        {user || player ? <ProfileMenu /> : <AuthButton />}
      </div>
    </header>
  );
}
