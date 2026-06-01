'use client';

/* renders Leave Group button, that handles several scenarios before actually leaving
  all controlled by ModalState variable, that tells us where in the process we are at
  Pre rendering, it calculates the following: total member count, is current user the only admin, 
  and is current user the last member. The four stages are:
  1. confirmLeave: initial 'are you sure?'
  2. onlyAdmin: blocks leaving group, tells user to promote someone else to admin first
  3. confirmLastMamber: warns that the group will be deleted if last member leaves
  4. error: shown if backend call fails.
*/
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
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

  const totalMembers = group.members.length + group.admins.length;
  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;
  const isLastMember = totalMembers === 1;

  // opens initial confirmation modal
  const handleClick = () => {
    setModal('confirmLeave');
  };

  // checks which scenario applies. If user is only admin, shows onlyAdmin modal.
  // if user is last member, shows confirmLastMember modal.
  // otherwise, calls executeLeave
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

  // POSTs to /groups/leave then refreshes the user in auth context
  // and clears the group from auth context via leaveGroup(), then navigates to /dashboard
  const executeLeave = async () => {
    if (!user || !group) return;
    try {
      await groupsApi.leave({ groupId: group.id, userId: user.id });
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
              Are you sure you want to permanently leave {group.name}?
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
              You are the last member of {group.name}. If you leave, the group
              will be permanently removed.
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
