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
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  // Guard. Returns null if no user or no group
  if (!user || !group) return null;

  // true if user is the only admin in the group
  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;

  // on clicking Delete Group. Checks conditional.
  const handleClick = () => {
    if (!isOnlyAdmin) {
      setResultMessage(
        `You cannot delete ${group.name} while there are other admins. ` +
          `Please demote all other admins first.`,
      );
      setShowResult(true);
      return;
    }
    setShowConfirm(true);
  };

  // deletes the group by POSTing delete to backend with groupId.
  const handleConfirm = async () => {
    try {
      const res = await fetch('http://localhost:4000/groups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      leaveGroup();
      router.push('/dashboard');
    } catch (error) {
      console.error('deleteGroup failed:', error);
      setShowConfirm(false);
      setResultMessage('Something went wrong. Please try again.');
      setShowResult(true);
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
            <h2 className="text-xl font-bold mb-3">Delete {group.name}?</h2>
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

      {/* Result modal */}
      {showResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">{resultMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowResult(false)}
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
