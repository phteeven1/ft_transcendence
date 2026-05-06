'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

type ModalState =
  | 'none'
  | 'confirmLeave'
  | 'onlyAdmin'
  | 'confirmLastMember'
  | 'error';

export default function LeaveGroup({ syncAndRefresh }: Props) {
  const { user, group, refreshUser, leaveGroup } = useAuth();
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>('none');

  if (!user || !group) return null;

  const totalMembers = group.groupMembers.length + group.groupAdmins.length;
  const isOnlyAdmin =
    group.groupAdmins.includes(user.userId) && group.groupAdmins.length === 1;
  const isLastMember = totalMembers === 1;

  const handleClick = () => {
    setModal('confirmLeave');
  };

  const handleConfirmLeave = () => {
    if (isOnlyAdmin && !isLastMember) {
      setModal('onlyAdmin');
      return;
    }
    if (isLastMember) {
      setModal('confirmLastMember');
      return;
    }
    executeLeave();
  };

  const executeLeave = async () => {
    if (!user || !group) return;
    try {
      const res = await fetch('http://localhost:4000/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.groupId, userId: user.userId }),
      });
      if (!res.ok) throw new Error(`Failed to leave group: ${res.status}`);
      await refreshUser();
      leaveGroup();
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to leave group:', error);
      setModal('error');
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Leave Group
      </button>

      {/* Confirm leave */}
      {modal === 'confirmLeave' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-3">Leave Group?</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to permanently leave {group.groupName}?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModal('none')}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeave}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Only admin — cannot leave */}
      {modal === 'onlyAdmin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">
              You are the only admin of this group. Before leaving, you need to
              make another member admin.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setModal('none')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm last member — group will be deleted */}
      {modal === 'confirmLastMember' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-3">Group will be deleted</h2>
            <p className="text-gray-700 mb-6">
              You are the last member of {group.groupName}. If you leave, the
              group will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModal('none')}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeLeave}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {modal === 'error' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">
              Something went wrong. Please try again.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setModal('none')}
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