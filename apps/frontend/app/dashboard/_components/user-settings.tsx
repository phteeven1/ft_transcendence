'use client';

/*
  Renders a User Settings button on the dashboard.
  Opens a modal where the user can view and edit:
    - Username (read-only)
    - Real name + show-to-group toggle
    - Email + show-to-group toggle
    - Relationship comment + show-to-group toggle + hint text
    - Password display + Change Password button
  Change Password opens a nested modal: old password, new password, confirm new password.
  On success, shows a result message before returning to the main modal.
  Confirm saves all fields via POST /users/update then refreshes auth context.
  Cancel closes without saving.
*/

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { usersApi } from '@/lib/api';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

export default function UserSettings() {
  const t = useTranslations('dashboard.settings');
  const tCommon = useTranslations('common');
  const { user, refreshUser } = useAuth();

  // main modal
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [originalUserName, setOriginalUserName] = useState('');
  const [realName, setRealName] = useState('');
  const [email, setEmail] = useState('');
  const [relationshipComment, setRelationshipComment] = useState('');
  const [showRealName, setShowRealName] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showRelationshipComment, setShowRelationshipComment] = useState(false);

  // change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // result modal (for change password outcome)
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  // result modal for username change reminder
  const [showUsernameReminder, setShowUsernameReminder] = useState(false);

  if (!user) return null;

  // populate local state from current user when opening
  const handleOpen = () => {
    setUserName(user.name);
    setOriginalUserName(user.name);
    setRealName(user.realName ?? '');
    setEmail(user.email ?? '');
    setRelationshipComment(user.relationshipComment ?? '');
    setShowRealName(user.showRealName ?? false);
    setShowEmail(user.showEmail ?? false);
    setShowRelationshipComment(user.showRelationshipComment ?? false);
    setShowModal(true);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

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
      setShowModal(false);
      if (userName !== originalUserName) {
        setShowUsernameReminder(true);
      }
    } catch (error) {
      console.error('Failed to save user settings:', error);
    }
  };

  // change password modal handlers
  const handleOpenPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleCancelPassword = () => {
    setShowPasswordModal(false);
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
      setResultMessage(t('passwordChangedSuccess'));
      setShowResult(true);
    } catch (error) {
      // backend returns 401 if old password is wrong
      setPasswordError(t('oldPasswordIncorrect'));
      console.error('changePassword failed:', error);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="secondary"
        size="lg"
        fullWidth
        className="clay-tile min-h-[5rem]"
      >
        {t('title')}
      </Button>

      <Dialog
        open={showModal}
        onClose={handleCancel}
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
        onClose={handleCancelPassword}
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

      <Dialog
        open={showResult}
        onClose={handleCloseResult}
        onConfirm={handleCloseResult}
        showCancel={false}
      >
        {resultMessage}
      </Dialog>

      <Dialog
        open={showUsernameReminder}
        onClose={() => setShowUsernameReminder(false)}
        onConfirm={() => setShowUsernameReminder(false)}
        showCancel={false}
      >
        {t('usernameChangedReminder', { username: userName })}
      </Dialog>
    </>
  );
}
