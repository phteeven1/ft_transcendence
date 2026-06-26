'use client';
/*
  Ask Admin button — visible to non-admins only.
  Allows a member to send a MEM message to all admins in the group.
  Placeholder: modal opens but does not yet send a message.
*/
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';

export default function MemberToAdmin() {
  const { group, user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!group || !user) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-purple-400 hover:bg-purple-500 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Ask Admin
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Ask Admin</h2>
            <p className="text-sm text-gray-500 italic mb-6">
              Placeholder — message sending coming soon.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
