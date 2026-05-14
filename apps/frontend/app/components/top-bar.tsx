'use client';
import FlagMenu from './flag-menu';
import AuthButton from './auth-button';
import { useAuth } from '../context/auth-context';

export default function TopBar() {
  const { user, group } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-emerald-200 border-b border-emerald-300">
      <div className="flex items-center gap-4">
        <span className="font-bold text-lg">Dictee</span>
        {user && (
          <span className="text-sm text-gray-600">
            Signed in as <strong>{user.name}</strong>
            {group && (
              <span>
                {' '}
                in group <strong>{group.name}</strong>
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <FlagMenu />
        <AuthButton />
      </div>
    </header>
  );
}
