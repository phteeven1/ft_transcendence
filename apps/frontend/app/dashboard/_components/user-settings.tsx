'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { usersApi } from '@/lib/api';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import type { User } from '../../types';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function UserSettings({ open, onClose }: Props) {
  const { user } = useAuth();
  if (!open || !user) return null;
  return <UserSettingsDialog user={user} onClose={onClose} />;
}

function UserSettingsDialog({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const t = useTranslations('dashboard.settings');
  const tCommon = useTranslations('common');
  const { refreshUser } = useAuth();

  const [userName, setUserName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saveError, setSaveError] = useState('');

  const handleConfirm = async () => {
    setSaveError('');
    try {
      await usersApi.update({
        userId: user.id,
        userName,
      });
      await refreshUser();
      onClose();
    } catch {
      setSaveError(tCommon('somethingWentWrong'));
    }
  };

  const handleOpenPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleConfirmPassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'));
      return;
    }
    if (newPassword.length === 0) {
      setPasswordError(t('passwordEmpty'));
      return;
    }
    try {
      await usersApi.changePassword({
        userId: user.id,
        oldPassword,
        newPassword,
      });
      setShowPasswordModal(false);
    } catch {
      setPasswordError(t('oldPasswordIncorrect'));
    }
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={t('title')}
        onConfirm={handleConfirm}
        confirmLabel={tCommon('confirm')}
      >
        <div className="flex flex-col gap-5">
          <Input
            label={t('usernameLabel')}
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />

          <Input
            label={t('emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <span className="block text-sm font-semibold text-foreground mb-1">
              {t('passwordLabel')}
            </span>
            <div className="overflow-visible pb-1">
              <Button variant="secondary" onClick={handleOpenPasswordModal}>
                {t('changePassword')}
              </Button>
            </div>
          </div>
          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={t('changePasswordTitle')}
        onConfirm={handleConfirmPassword}
        confirmLabel={tCommon('confirm')}
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t('oldPasswordLabel')}
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <Input
            label={t('newPasswordLabel')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label={t('confirmNewPasswordLabel')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {passwordError && (
            <p className="text-destructive text-sm">{passwordError}</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
