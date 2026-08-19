'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../context/auth-context';
import { playersApi } from '@/lib/api';
import { getPlayerSession } from '@/lib/player-session';
import { Button, Dropdown, DropdownItem, Icon } from './ui';
import AbandonPlayModal from './abandon-play-modal';
import UserSettings from '../dashboard/_components/user-settings';

export default function ProfileMenu() {
  const t = useTranslations('nav');
  const tDashboard = useTranslations('dashboard');
  const { user, player, logout, logoutPlayer } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLeaveSessionModal, setShowLeaveSessionModal] = useState(false);
  const [isLeavingSession, setIsLeavingSession] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!user && !player) return null;

  const displayName = player?.name ?? user?.name ?? '';

  const handleSignOut = () => {
    setIsOpen(false);
    logout();
    router.push('/');
  };

  const openLeaveSessionModal = () => {
    setIsOpen(false);
    setShowLeaveSessionModal(true);
  };

  const handleLeaveSession = async () => {
    const playerId = player?.id;
    const stored = getPlayerSession();
    setShowLeaveSessionModal(false);
    setIsLeavingSession(true);
    if (playerId) {
      try {
        await playersApi.clearSession(playerId, stored?.token);
      } catch {
        /* parent dashboard is still reachable */
      }
    }
    logoutPlayer();
    setIsLeavingSession(false);
    router.replace('/dashboard');
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('profileMenu')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="px-2"
      >
        <Icon name="user" size={20} />
      </Button>

      {isOpen && (
        <Dropdown
          role="menu"
          className="absolute right-0 mt-2 flex flex-col min-w-[12rem] z-50"
        >
          <div className="px-3 py-2 text-sm font-semibold text-foreground truncate border-b border-border">
            {displayName}
          </div>

          {player ? (
            <DropdownItem role="menuitem" onClick={openLeaveSessionModal}>
              <Icon name="sign-out" size={16} />
              {t('leaveSession')}
            </DropdownItem>
          ) : (
            <>
              <DropdownItem
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Icon name="gear" size={16} />
                {tDashboard('userSettings')}
              </DropdownItem>
              <DropdownItem role="menuitem" onClick={handleSignOut}>
                <Icon name="sign-out" size={16} />
                {t('signOut')}
              </DropdownItem>
            </>
          )}
        </Dropdown>
      )}

      {showLeaveSessionModal && (
        <AbandonPlayModal
          kind="session"
          onStay={() => {
            setShowLeaveSessionModal(false);
            setIsLeavingSession(false);
          }}
          onLeave={() => void handleLeaveSession()}
          isLeaving={isLeavingSession}
        />
      )}

      <UserSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
