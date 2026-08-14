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
  const [realName, setRealName] = useState(user.realName ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [relationshipComment, setRelationshipComment] = useState(
    user.relationshipComment ?? '',
  );
  const [showRealName, setShowRealName] = useState(user.showRealName ?? false);
  const [showEmail, setShowEmail] = useState(user.showEmail ?? false);
  const [showRelationshipComment, setShowRelationshipComment] = useState(
    user.showRelationshipComment ?? false,
  );

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleConfirm = async () => {
    try {
      await usersApi.update({
        userId: user.id,
        userName,
        realName,
        relationshipComment,
        showEmail,
        showRealName,
        showRelationshipComment,
      });
      await refreshUser();
      onClose();
    } catch (error) {
      console.error('Failed to save user settings:', error);
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
    } catch (error) {
      setPasswordError(t('oldPasswordIncorrect'));
      console.error('changePassword failed:', error);
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
        scrollable
      >
        <div className="flex flex-col gap-5">
          <Input
            label={t('usernameLabel')}
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />

          <div>
            <Input
              label={t('realNameLabel')}
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
            />
            <label className="flex items-center gap-2 mt-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showRealName}
                onChange={(e) => setShowRealName(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              {t('showToGroup')}
            </label>
          </div>

          <div>
            <Input
              label={t('emailLabel')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="flex items-center gap-2 mt-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showEmail}
                onChange={(e) => setShowEmail(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              {t('showToGroup')}
            </label>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="block text-sm font-semibold text-foreground">
                {t('relationshipCommentLabel')}
              </span>
              <p className="text-xs text-muted-foreground italic">
                {t('relationshipCommentHint')}
              </p>
            </div>
            <Input
              type="text"
              value={relationshipComment}
              onChange={(e) => setRelationshipComment(e.target.value)}
            />
            <label className="flex items-center gap-2 mt-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showRelationshipComment}
                onChange={(e) =>
                  setShowRelationshipComment(e.target.checked)
                }
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              {t('showToGroup')}
            </label>
          </div>

          <div>
            <span className="block text-sm font-semibold text-foreground mb-1">
              {t('passwordLabel')}
            </span>
            <Button variant="secondary" onClick={handleOpenPasswordModal}>
              {t('changePassword')}
            </Button>
          </div>
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
