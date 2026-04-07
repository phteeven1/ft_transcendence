'use client'

import FlagMenu from './flag-menu'
import AuthButton from './auth-button';
import { useAuth } from '../context/auth-context';

export default function TopBar() {
  const { user } = useAuth(); // get the logged-in user from auth context

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <span className="font-bold text-lg">Dictee</span>
        {/* Show "Signed In as <userName>" only if user is logged in */}
        {user && (
          <span className="text-sm text-gray-600">
            Signed In as {user.userName}
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