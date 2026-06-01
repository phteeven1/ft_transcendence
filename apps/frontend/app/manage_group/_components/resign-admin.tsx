'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function ResignAdmin({ syncAndRefresh }: Props) {
  const { user, group } = useAuth();
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  if (!user || !group) return null;

  const isOnlyAdmin = group.admins.length === 1;

  const handleResign = async () => {
    if (isOnlyAdmin) {
      setResultMessage(
        'You are the only admin of this group. Promote another member to admin before resigning.',
      );
      setShowResult(true);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to resign as admin of ${group.name}? You will become a regular member.`,
    );
    if (!confirmed) return;

    try {
      await groupsApi.demote({ groupId: group.id, userId: user.id });
      await syncAndRefresh();
      setResultMessage(
        `You have successfully resigned as admin of ${group.name}. You are now a regular member.`,
      );
      setShowResult(true);
    } catch (error) {
      console.error('Resign failed:', error);
      setResultMessage('Something went wrong. Please try again.');
      setShowResult(true);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  return (
    <>
      <button
        onClick={handleResign}
        className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Resign as Admin
      </button>

      {showResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">{resultMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={handleCloseResult}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
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
