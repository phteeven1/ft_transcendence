'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function DeleteGroup({ syncAndRefresh }: Props) {
  const { user, group, leaveGroup } = useAuth();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user || !group) return null;

  const isOnlyAdmin =
    group.groupAdmins.includes(user.userId) &&
    group.groupAdmins.length === 1;

  const handleClick = () => {
    if (!isOnlyAdmin) {
      alert(
        `You cannot delete ${group.groupName} while there are other admins. ` +
        `Please ask all other admins to Resign as Admin or Leave Group first.`
      );
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    try {
      const res = await fetch('http://localhost:4000/groups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.groupId }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      leaveGroup();
      router.push('/dashboard');
    } catch (error) {
      console.error('deleteGroup failed:', error);
      setShowConfirm(false);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Delete Group
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-3">Delete {group.groupName}?</h2>
            <p className="text-gray-700 mb-6">
              This will permanently delete the group and all player profiles
              belonging to it. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}