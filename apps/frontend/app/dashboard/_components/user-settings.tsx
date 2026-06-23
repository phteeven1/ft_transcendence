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
import { useAuth } from '../../context/auth-context';
import { usersApi } from '@/lib/api';

export default function UserSettings() {
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
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length === 0) {
      setPasswordError('New password cannot be empty.');
      return;
    }
    try {
      await usersApi.changePassword({
        userId: user.id,
        oldPassword,
        newPassword,
      });
      setShowPasswordModal(false);
      setResultMessage('Your password was changed successfully.');
      setShowResult(true);
    } catch (error) {
      // backend returns 401 if old password is wrong
      setPasswordError('Old password is incorrect. Please try again.');
      console.error('changePassword failed:', error);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-4 px-4 rounded transition-colors"
      >
        User Settings
      </button>

      {/* Main settings modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">

            <div className="p-6 pb-2">
              <h2 className="text-xl font-bold mb-1">User Settings</h2>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-2 flex flex-col gap-5">

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Real name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Real Name
                </label>
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRealName}
                    onChange={(e) => setShowRealName(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  Show to other users in same group
                </label>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  Show to other users in same group
                </label>
              </div>

              {/* Relationship comment */}
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship Comment
                    </label>
                    <p className="text-xs text-gray-400 italic mb-1">
                    For example: Dana's Mum
                    </p>
                    </div>
                <input
                  type="text"
                  value={relationshipComment}
                  onChange={(e) => setRelationshipComment(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRelationshipComment}
                    onChange={(e) =>
                      setShowRelationshipComment(e.target.checked)
                    }
                    className="w-4 h-4 accent-indigo-500"
                  />
                  Show to other users in same group
                </label>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <button
                  onClick={handleOpenPasswordModal}
                  className="bg-gray-300 hover:bg-gray-500 text-black hover:text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Change Password
                </button>
              </div>

            </div>

            {/* Confirm / Cancel */}
            <div className="p-6 pt-4 flex gap-3 justify-end border-t border-gray-100">
              <button
                onClick={handleCancel}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Change password modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">

            <div className="p-6 pb-2">
              <h2 className="text-xl font-bold mb-1">Change Password</h2>
            </div>

            <div className="px-6 py-2 flex flex-col gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Old Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Inline error */}
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}

            </div>

            <div className="p-6 pt-4 flex gap-3 justify-end border-t border-gray-100">
              <button
                onClick={handleCancelPassword}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPassword}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Result modal — password change outcome */}
      {showResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">{resultMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={handleCloseResult}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Username change reminder */}
      {showUsernameReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">
              Your username has been changed to <span className="font-semibold">{userName}</span>. Remember to use it next time you sign in.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowUsernameReminder(false)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}